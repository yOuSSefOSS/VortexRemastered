import sys
import json
import numpy as np
import neuralfoil as nf


def evaluate_airfoil_payload(data):
    """
    Evaluate aerodynamic coefficients in memory using NeuralFoil without temporary disk files.
    Uses an AoA-degree-based post-stall decay model rather than array-index steps.
    """
    alpha_input = data.get("alpha", 0.0)
    re = float(data.get("Re", data.get("reynolds", 1e6)))
    model_size = data.get("modelSize", "large")
    raw_points = data.get("points", data.get("coordinates", None))

    if isinstance(alpha_input, list):
        alpha_list = [float(a) for a in alpha_input]
    else:
        alpha_list = [float(alpha_input)]

    alpha_array = np.array(alpha_list, dtype=float)

    if not raw_points or len(raw_points) < 6:
        return {"error": "Airfoil coordinate array must contain at least 6 points."}

    coords = np.array(raw_points, dtype=float)
    if coords.ndim != 2 or coords.shape[1] != 2:
        return {"error": "Airfoil coordinates must be an N x 2 array of [x, y] pairs."}

    aero = nf.get_aero_from_coordinates(
        coordinates=coords,
        alpha=alpha_array,
        Re=re,
        model_size=model_size,
    )

    cl_raw = aero["CL"]
    cd_raw = aero["CD"]
    cm_raw = aero["CM"]

    cl_data = cl_raw.tolist() if isinstance(cl_raw, np.ndarray) else [float(cl_raw)]
    cd_data = cd_raw.tolist() if isinstance(cd_raw, np.ndarray) else [float(cd_raw)]
    cm_data = cm_raw.tolist() if isinstance(cm_raw, np.ndarray) else [float(cm_raw)]

    # Post-stall separation decay governed by degrees beyond critical AoA (not array index distance)
    if len(cl_data) > 5:
        pos_indices = [i for i, a in enumerate(alpha_list) if 8.0 <= a <= 22.0]
        if pos_indices:
            peak_idx = max(pos_indices, key=lambda idx: cl_data[idx])
            stall_aoa = alpha_list[peak_idx]
            peak_cl = cl_data[peak_idx]

            for i in range(peak_idx + 1, len(alpha_list)):
                deg_past_stall = max(0.0, alpha_list[i] - stall_aoa)
                if deg_past_stall > 0.0:
                    # Smooth post-stall separation plateau (~45% of peak CL at deep stall)
                    decay = 0.45 + 0.55 * float(np.exp(-deg_past_stall / 6.5))
                    cl_data[i] = round(min(cl_data[i], peak_cl * decay), 5)
                    cd_data[i] = round(
                        cd_data[i] + 0.012 * (deg_past_stall ** 1.35), 5
                    )

    top_xtr = aero.get("upper_bl_ue_over_vinf", [0.0] * len(alpha_list))
    bot_xtr = aero.get("lower_bl_ue_over_vinf", [0.0] * len(alpha_list))

    return {
        "alpha": alpha_list,
        "CL": [float(x) for x in cl_data],
        "CD": [float(x) for x in cd_data],
        "CM": [float(x) for x in cm_data],
        "Top_Xtr": (
            top_xtr.tolist() if isinstance(top_xtr, np.ndarray) else list(top_xtr)
        ),
        "Bot_Xtr": (
            bot_xtr.tolist() if isinstance(bot_xtr, np.ndarray) else list(bot_xtr)
        ),
    }


def process_message(payload):
    request_id = payload.get("request_id")
    try:
        if isinstance(payload.get("batch"), list):
            results = []
            for item in payload["batch"]:
                res = evaluate_airfoil_payload(item)
                res["id"] = item.get("id")
                res["name"] = item.get("name")
                results.append(res)
            return {"request_id": request_id, "batch_results": results}

        result = evaluate_airfoil_payload(payload)
        if request_id is not None:
            result["request_id"] = request_id
        return result
    except Exception as exc:
        return {"request_id": request_id, "error": str(exc)}


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--daemon":
        for line in sys.stdin:
            line_str = line.strip()
            if not line_str:
                continue
            try:
                incoming = json.loads(line_str)
                response = process_message(incoming)
            except Exception as parse_err:
                response = {"error": f"Invalid JSON payload: {str(parse_err)}"}
            sys.stdout.write(json.dumps(response) + "\n")
            sys.stdout.flush()
    else:
        raw_arg = sys.argv[1] if len(sys.argv) > 1 else "{}"
        try:
            incoming = json.loads(raw_arg)
            print(json.dumps(process_message(incoming)))
        except Exception as err:
            print(json.dumps({"error": str(err)}))
