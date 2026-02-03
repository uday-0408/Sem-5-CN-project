from ..services.step_tracker import StepTracker

def run_lrc(data, introduce_error=False):
    tracker = StepTracker()
    tracker.add_step("Start LRC", f"Input Data: {data}")
    
    # Block size determination
    n = len(data)
    block_size = 8
    if n <= 16:
        block_size = 4
        
    tracker.add_step("Configuration", f"Block Size set to {block_size} bits.")
    
    # Padding
    padding_needed = block_size - (n % block_size)
    if padding_needed == block_size:
        padding_needed = 0
        
    processed_data = data
    if padding_needed > 0:
        processed_data = data + ('0' * padding_needed)
        tracker.add_step("Padding", f"Added {padding_needed} zero(s) to end. Data: {processed_data}")
        
    # Split into blocks
    blocks = [processed_data[i:i+block_size] for i in range(0, len(processed_data), block_size)]
    tracker.add_step("Blocking", f"Data split into {len(blocks)} blocks: {blocks}")
    
    # --- Sender Side ---
    lrc_bits = []
    tracker.add_step("Sender: Calculating Column Parity", "Iterating columns...")
    
    for col in range(block_size):
        ones_count = 0
        col_bits = []
        for block in blocks:
            bit = block[col]
            col_bits.append(bit)
            if bit == '1':
                ones_count += 1
        
        parity = '1' if ones_count % 2 != 0 else '0'
        lrc_bits.append(parity)
        tracker.add_step(f"Sender: Column {col}", f"Bits: {col_bits}. 1s count: {ones_count}. Parity: {parity}")
        
    lrc_block = "".join(lrc_bits)
    transmitted_data = processed_data + lrc_block
    
    tracker.add_step("Sender: Finalize", f"LRC Block: {lrc_block}. Transmitted: {transmitted_data}")
    
    # --- Channel ---
    received_data = transmitted_data
    if introduce_error:
        # Flip a bit in the data part
        pos = 0 # Flip first bit
        flipped = '1' if received_data[pos] == '0' else '0'
        received_data = flipped + received_data[1:]
        tracker.add_step("Channel: Error Injection", f"Bit at index {pos} flipped. {transmitted_data} -> {received_data}")
        
    # --- Receiver Side ---
    tracker.add_step("Receiver: Start Check", f"Received Data: {received_data}")
    
    # Split received data
    # We know block_size. Total length must be multiple of block_size? No, data blocks + 1 LRC block.
    # So total length should be divisible by block_size.
    
    rec_blocks = [received_data[i:i+block_size] for i in range(0, len(received_data), block_size)]
    tracker.add_step("Receiver: Blocking", f"Received blocks: {rec_blocks}")
    
    lrc_check_bits = []
    error_found = False
    
    for col in range(block_size):
        ones_count = 0
        for block in rec_blocks: # This includes the received LRC block effectively?
             # Wait. The receiver checks parity of ALL blocks INCLUDING the LRC block.
             # If correct, column sums should be even (0).
             if block[col] == '1':
                 ones_count += 1
        
        result_parity = '1' if ones_count % 2 != 0 else '0'
        lrc_check_bits.append(result_parity)
        
    final_check = "".join(lrc_check_bits)
    # If final_check is all '0's, then no error (assuming even parity logic holds for the whole set including LRC)
    
    # Logic:
    # Data columns + LRC column = Even parity total?
    # Sender: Data sums to X. LRC = X % 2.
    # Receiver: Data + LRC. Sums should be 0 mod 2. 
    # Yes.
    
    is_zero = all(c == '0' for c in final_check)
    error_detected = not is_zero
    
    tracker.add_step("Receiver: Validation", f"Computed Parity of all blocks (including LRC): {final_check}")
    
    if error_detected:
        explanation = "Error Detected: Columns do not sum to even parity."
    else:
        explanation = "Accepted: All columns sum to even parity."
        
    return {
        "original_data": data,
        "transmitted_data": transmitted_data,
        "received_data": received_data,
        "error_detected": error_detected,
        "steps": tracker.get_steps(),
        "explanation": explanation
    }
