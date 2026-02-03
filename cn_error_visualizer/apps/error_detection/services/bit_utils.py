def xor(a, b):
    """
    Performs bitwise XOR on two binary strings of equal length.
    Returns the result as a binary string.
    """
    res = []
    for i in range(len(b)):
        if a[i] == b[i]:
            res.append('0')
        else:
            res.append('1')
    return "".join(res)

def calculate_parity(bits):
    """
    Returns '1' if number of 1s is odd, '0' otherwise.
    Manual counting implementation.
    """
    ones = 0
    for bit in bits:
        if bit == '1':
            ones += 1
    return '1' if ones % 2 != 0 else '0'
