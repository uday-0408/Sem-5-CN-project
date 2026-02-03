from ..services.step_tracker import StepTracker

from ..services.bit_utils import xor

def mod2div(dividend, divisor, tracker=None, stage_name="Sender"):
    # Reference length
    pick = len(divisor)
    
    # Slicing the dividend to appropriate length for first step
    tmp = dividend[0 : pick]
    
    n = len(dividend)
    
    if tracker:
        tracker.add_step(f"{stage_name}: Div Start", f"Dividend: {dividend}, Divisor: {divisor}, Initial Chunk: {tmp}")
    
    while pick < n:
        if tmp[0] == '1':
            # XOR with divisor
            result = xor(divisor, tmp)
            # Drop the leading bit (which is now 0) and pull down next
            # result[1:] + next_bit
            next_bit = dividend[pick]
            new_tmp = result[1:] + next_bit
            
            if tracker:
                tracker.add_step(f"{stage_name}: Step (XOR)", 
                                 f"Current: {tmp} (Starts with 1). XOR {divisor} -> {result}. Pull down {next_bit} -> New: {new_tmp}")
            tmp = new_tmp
        else:
            # If leading bit is 0, we effectively XOR with 000...0 or just shift.
            # result of XOR with 0 is just tmp.
            # So we just drop leading 0 and pull next bit.
            # But mathematically: XOR with '0'*len(divisor)
            next_bit = dividend[pick]
            new_tmp = tmp[1:] + next_bit
            
            if tracker:
                tracker.add_step(f"{stage_name}: Step (Skip)", 
                                 f"Current: {tmp} (Starts with 0). No XOR (Shift). Pull down {next_bit} -> New: {new_tmp}")
            tmp = new_tmp
            
        pick += 1

    # For the last remaining bits (after loop finishes 'pick' reaches end)
    # The 'tmp' now has length 'len(divisor)'. 
    # But usually we perform the operation one last time?
    # Wait, the loop runs while pick < n.
    # In strict long division, after pulling down the last bit, we do one final check/operation.
    
    if tmp[0] == '1':
        result = xor(divisor, tmp)
        remainder = result[1:]
        if tracker:
            tracker.add_step(f"{stage_name}: Final Step", f"Current: {tmp}. XOR {divisor} -> {result}. Remainder: {remainder}")
        tmp = remainder
    else:
        remainder = tmp[1:]
        if tracker:
            tracker.add_step(f"{stage_name}: Final Step", f"Current: {tmp}. Starts with 0. Remainder: {remainder}")
        tmp = remainder

    return tmp

def run_crc(data, generator="1001", introduce_error=False):
    tracker = StepTracker()
    tracker.add_step("Start CRC", f"Data: {data}, Generator: {generator}")
    
    # --- Sender ---
    # Append zeros
    l_gen = len(generator)
    appended_data = data + '0'*(l_gen-1)
    tracker.add_step("Sender: Padding", f"Appended {l_gen-1} zeros: {appended_data}")
    
    remainder = mod2div(appended_data, generator, tracker, "Sender")
    
    encoded_data = data + remainder
    tracker.add_step("Sender: Finalize", f"CRC Remainder: {remainder}. Transmitted: {encoded_data}")
    
    # --- Channel ---
    received_data = encoded_data
    if introduce_error:
        # Flip bit
        # Ensure we flip a bit that CHANGES the remainder. Usually any bit flip does.
        # Flip the last bit of the data part.
        pos = 0 
        bit = received_data[pos]
        flipped = '1' if bit == '0' else '0'
        received_data = flipped + received_data[1:]
        tracker.add_step("Channel: Error Injection", f"Bit {pos} flipped. {encoded_data} -> {received_data}")
        
    # --- Receiver ---
    tracker.add_step("Receiver: Verification", f"Dividing Received Data by Generator...")
    
    check_remainder = mod2div(received_data, generator, tracker, "Receiver")
    
    # Check if remainder is all zeros
    is_zero = all(c == '0' for c in check_remainder)
    error_detected = not is_zero
    
    tracker.add_step("Result", f"Final Remainder: {check_remainder}. Error Detected: {error_detected}")
    
    return {
        "original_data": data,
        "transmitted_data": encoded_data,
        "received_data": received_data,
        "error_detected": error_detected,
        "steps": tracker.get_steps(),
        "explanation": "Detected error via non-zero remainder" if error_detected else "Transmission clean"
    }
