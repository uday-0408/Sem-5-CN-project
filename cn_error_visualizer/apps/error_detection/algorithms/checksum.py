from ..services.step_tracker import StepTracker

def full_adder(a, b, tracker=None, step_desc="Addition"):
    # Adds two equal length binary strings
    # Returns (result_string, carry_out_bit)
    n = len(a)
    result = []
    carry = 0
    
    # Iterate from LSB (right) to MSB (left)
    for i in range(n - 1, -1, -1):
        bit_a = 1 if a[i] == '1' else 0
        bit_b = 1 if b[i] == '1' else 0
        total = bit_a + bit_b + carry
        
        if total == 0:
            res_bit = '0'; carry = 0
        elif total == 1:
            res_bit = '1'; carry = 0
        elif total == 2:
            res_bit = '0'; carry = 1
        elif total == 3:
            res_bit = '1'; carry = 1
        else: # Should not happen
            res_bit = '0'; carry = 0
            
        result.append(res_bit)
        
    final_res = "".join(reversed(result))
    return final_res, carry

def ones_complement(bits):
    return "".join(['1' if b == '0' else '0' for b in bits])

def run_checksum(data, introduce_error=False):
    tracker = StepTracker()
    tracker.add_step("Start Checksum", f"Input Data: {data}")
    
    # Block size
    n = len(data)
    block_size = 8
    if n <= 16:
        block_size = 4
    
    # Padding
    rem = n % block_size
    processed_data = data
    if rem != 0:
        padding = block_size - rem
        processed_data = ('0' * padding) + data # Pad LEFT for number value consistency? 
        # Or right? Standard is usually pad to fit borders.
        # Let's pad LEFT (Leading zeros don't change value, but make blocks align).
        tracker.add_step("Padding", f"Padded with {padding} zeros at start. Data: {processed_data}")
        
    blocks = [processed_data[i:i+block_size] for i in range(0, len(processed_data), block_size)]
    tracker.add_step("Blocking", f"Blocks: {blocks}")
    
    # --- Sender Calculation ---
    current_sum = blocks[0]
    
    tracker.add_step("Sender: Summation", f"Initial Sum = Block 0: {current_sum}")
    
    for i in range(1, len(blocks)):
        next_block = blocks[i]
        temp_sum, carry = full_adder(current_sum, next_block)
        tracker.add_step(f"Sender: Add Block {i}", f"{current_sum} + {next_block} = {temp_sum}, Carry: {carry}")
        
        while carry:
            # Wrap around carry
            # Add carry (which is 1) to sum
            carry_adder_input = '1'.zfill(block_size)
            s2, c2 = full_adder(temp_sum, carry_adder_input)
            tracker.add_step("Sender: Wrap Carry", f"Wrapped carry: {temp_sum} + 1 = {s2}, New Carry: {c2}")
            temp_sum = s2
            carry = c2
        
        current_sum = temp_sum
        
    checksum = ones_complement(current_sum)
    tracker.add_step("Sender: Complement", f"Sum: {current_sum} -> Checksum (1s Comp): {checksum}")
    
    transmitted_data = processed_data + checksum # Appended at end
    tracker.add_step("Sender: Finalize", f"Sent: {transmitted_data}")
    
    # --- Channel ---
    received_data = transmitted_data
    if introduce_error:
        # Flip bit in data part
        pos = 0
        flipped = '1' if received_data[pos] == '0' else '0'
        received_data = flipped + received_data[1:]
        tracker.add_step("Channel: Error Injection", f"Bit {pos} flipped. {transmitted_data} -> {received_data}")
        
    # --- Receiver ---
    # Separate data and checksum
    # Last 'block_size' bits are checksum
    rec_checksum = received_data[-block_size:]
    rec_data = received_data[:-block_size]
    
    rec_blocks = [rec_data[i:i+block_size] for i in range(0, len(rec_data), block_size)]
    # Add all received data blocks
    
    tracker.add_step("Receiver: Parsing", f"Data Blocks: {rec_blocks}. Received Checksum: {rec_checksum}")
    
    curr_rec_sum = rec_blocks[0]
    for i in range(1, len(rec_blocks)):
        nb = rec_blocks[i]
        ts, c = full_adder(curr_rec_sum, nb)
        while c:
            ts, c = full_adder(ts, '1'.zfill(block_size))
        curr_rec_sum = ts
        
    tracker.add_step("Receiver: Data Sum", f"Sum of data segments: {curr_rec_sum}")
    
    # Add received checksum to this sum
    final_sum, final_carry = full_adder(curr_rec_sum, rec_checksum)
    tracker.add_step("Receiver: Add Checksum", f"{curr_rec_sum} + {rec_checksum} = {final_sum}, Carry: {final_carry}")
    
    while final_carry:
        final_sum, final_carry = full_adder(final_sum, '1'.zfill(block_size))
        tracker.add_step("Receiver: Wrap Carry", f"Wrapped: {final_sum}")
        
    # Result should be all 1s
    is_valid = all(b == '1' for b in final_sum)
    
    # Complement of result should be 0
    final_result_comp = ones_complement(final_sum)
    
    tracker.add_step("Receiver: Final Check", f"Sum is {final_sum}. Complement is {final_result_comp}. All 0s expected.")
    
    error_detected = not is_valid
    
    return {
        "original_data": data,
        "transmitted_data": transmitted_data,
        "received_data": received_data,
        "error_detected": error_detected,
        "steps": tracker.get_steps(),
        "explanation": "Valid (All 1s in sum)" if is_valid else "Error Detected (Sum not all 1s)"
    }
