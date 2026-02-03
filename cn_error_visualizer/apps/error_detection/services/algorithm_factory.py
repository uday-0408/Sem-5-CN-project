from ..algorithms.vrc import run_vrc
from ..algorithms.lrc import run_lrc
from ..algorithms.crc import run_crc
from ..algorithms.checksum import run_checksum

class AlgorithmFactory:
    @staticmethod
    def run_algorithm(technique, data, **kwargs):
        technique = technique.lower()
        introduce_error = kwargs.get('introduce_error', False)
        
        # Validation
        if not all(c in '01' for c in data):
            # Try to handle or let it fail?
            # Better to return error structure or let views handle it.
            # Assuming clean input from view.
            pass

        if technique == 'vrc':
            return run_vrc(data, introduce_error)
        elif technique == 'lrc':
            return run_lrc(data, introduce_error)
        elif technique == 'crc':
            generator = kwargs.get('generator', '1001')
            return run_crc(data, generator, introduce_error)
        elif technique == 'checksum':
            return run_checksum(data, introduce_error)
        else:
            raise ValueError(f"Unknown technique: {technique}")
