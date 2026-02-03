from ..services.step_tracker import StepTracker

def run_vrc(data, introduce_error=False):
    tracker = StepTracker()
    tracker.add_step("Start VRC", f"Input Data: {data}")
    
    # --- Sender Side ---
    ones_count = 0
    tracker.add_step("Sender: Counting 1s", "Iterating through bits...")
    
    for i, bit in enumerate(data):
        if bit == '1':
            ones_count += 1
            tracker.add_step(f"Sender: Bit {i}", f"Found '1'. Current count: {ones_count}")
        else:
            tracker.add_step(f"Sender: Bit {i}", f"Found '0'. Current count: {ones_count}")
            
    parity_bit = '1' if ones_count % 2 != 0 else '0'
    transmitted_data = data + parity_bit
    
    tracker.add_step("Sender: Parity Calculation", 
                     f"Total 1s: {ones_count}. {ones_count} is {'Odd' if ones_count % 2 else 'Even'}. Parity Bit: {parity_bit}",
                     state={"data": data, "parity": parity_bit})
    
    # --- Channel ---
    received_data = transmitted_data
    if introduce_error:
        # Flip the first bit (index 0)
        bit = received_data[0]
        flipped = '1' if bit == '0' else '0'
        received_data = flipped + received_data[1:]
        tracker.add_step("Channel: Error Injection", 
                         f"Noise introduced! Bit 0 flipped. {transmitted_data} -> {received_data}")
    else:
        tracker.add_step("Channel", "Transmission successful. No errors.")

    # --- Receiver Side ---
    tracker.add_step("Receiver: Start Check", f"Received Data: {received_data}")
    
    rec_data_only = received_data[:-1]
    rec_parity = received_data[-1]
    
    rec_ones_count = 0
    for bit in rec_data_only:
        if bit == '1':
            rec_ones_count += 1
            
    calc_parity = '1' if rec_ones_count % 2 != 0 else '0'
    
    error_detected = (calc_parity != rec_parity)
    
    tracker.add_step("Receiver: Verification", 
                     f"Count of 1s in data part: {rec_ones_count}. "
                     f"Expected Parity: {calc_parity}. Received Parity: {rec_parity}.")
    
    if error_detected:
        explanation = "Error Detected: Parity mismatch."
    else:
        explanation = "Accepted: Parity matches."
        
    tracker.add_step("Result", explanation, state={"error_detected": error_detected})
    
    return {
        "original_data": data,
        "transmitted_data": transmitted_data,
        "received_data": received_data,
        "error_detected": error_detected,
        "steps": tracker.get_steps(),
        "explanation": explanation
    }
