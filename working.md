# Error Detection Visualizer - Complete Technical Documentation

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Backend Architecture](#backend-architecture)
3. [Frontend Architecture](#frontend-architecture)
4. [Data Flow & API Contracts](#data-flow--api-contracts)
5. [Algorithm Implementation Details](#algorithm-implementation-details)
6. [UI Component Breakdown](#ui-component-breakdown)
7. [State Management & Rendering](#state-management--rendering)

---

## Architecture Overview

### Stack
- **Backend**: Django 5.2.10 + Django REST Framework
- **Frontend**: React 18 (Vite) + TailwindCSS
- **Communication**: REST API over HTTP (JSON payloads)
- **Development Servers**:
  - Backend: `http://127.0.0.1:8000`
  - Frontend: `http://localhost:5173`

### CORS Configuration
Backend allows cross-origin requests from:
- `http://localhost:5173`
- `http://127.0.0.1:5173`

Configured in `config/settings.py`:
```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
```

Middleware order ensures `corsheaders.middleware.CorsMiddleware` runs first.

---

## Backend Architecture

### Directory Structure
```
cn_error_visualizer/
├── config/                 # Django project configuration
│   ├── settings.py        # CORS, INSTALLED_APPS, middleware
│   ├── urls.py            # Routes /api/ to error_detection app
│   └── wsgi.py            # WSGI entry point
├── apps/
│   └── error_detection/   # Main application
│       ├── models.py      # Empty (no database models)
│       ├── api/           # REST API layer
│       │   ├── serializers.py  # Request validation
│       │   ├── views.py        # API endpoint
│       │   └── urls.py         # API routing
│       ├── algorithms/    # Error detection implementations
│       │   ├── vrc.py     # Vertical Redundancy Check
│       │   ├── lrc.py     # Longitudinal Redundancy Check
│       │   ├── crc.py     # Cyclic Redundancy Check
│       │   └── checksum.py # Checksum
│       └── services/      # Utility modules
│           ├── algorithm_factory.py  # Algorithm dispatcher
│           ├── step_tracker.py       # Execution logging
│           └── bit_utils.py          # Binary operations
└── db.sqlite3             # SQLite database (unused by app)
```

### API Endpoint

#### URL Routing
```
/api/detect-error/  → DetectErrorView (POST)
```

Configured in:
- `config/urls.py`: `path('api/', include('apps.error_detection.api.urls'))`
- `apps/error_detection/api/urls.py`: `path('detect-error/', DetectErrorView.as_view())`

Full URL: `http://127.0.0.1:8000/api/detect-error/`

#### Request Schema
**File**: `apps/error_detection/api/serializers.py`

**Serializer**: `ErrorDetectionRequestSerializer`

| Field | Type | Required | Validation | Default | Description |
|-------|------|----------|------------|---------|-------------|
| `technique` | String (ChoiceField) | Yes | Must be one of: `'vrc'`, `'lrc'`, `'crc'`, `'checksum'` | - | Error detection algorithm |
| `data` | String (RegexField) | Yes | Regex: `^[01]+$` (only 0s and 1s) | - | Binary data to transmit |
| `generator` | String (RegexField) | No* | Regex: `^[01]+$` | `"1001"` | CRC divisor polynomial |
| `introduce_error` | Boolean | No | - | `false` | Whether to inject bit flip |

*Required when `technique='crc'`

**Validation Logic**:
```python
def validate(self, attrs):
    if attrs['technique'] == 'crc' and not attrs.get('generator'):
        raise ValidationError({"generator": "Generator polynomial is required for CRC."})
    return attrs
```

**Example Request**:
```json
POST /api/detect-error/
Content-Type: application/json

{
  "technique": "vrc",
  "data": "11010110",
  "introduce_error": true
}
```

#### Response Schema
**File**: Returns from algorithm files via `AlgorithmFactory`

**Structure**: All algorithms return this JSON structure:
```typescript
{
  original_data: string,      // Input binary string
  transmitted_data: string,   // Data + parity/checksum/CRC bits
  received_data: string,      // What receiver gets (may have error)
  error_detected: boolean,    // Result of verification
  steps: Array<{              // Step-by-step execution log
    title: string,            // Step name (e.g., "Sender: Bit 3")
    description: string,      // Human-readable explanation
    state: {                  // Algorithm-specific visualization data
      [key: string]: any      // Varies by technique and step
    }
  }>,
  explanation: string         // Final result summary
}
```

**HTTP Status Codes**:
- `200 OK`: Successful processing
- `400 Bad Request`: Validation error (returns serializer errors)
- `500 Internal Server Error`: Algorithm execution error

#### View Implementation
**File**: `apps/error_detection/api/views.py`

**Class**: `DetectErrorView(APIView)`

**Flow**:
1. Deserializes request using `ErrorDetectionRequestSerializer`
2. Validates input (serializer handles validation)
3. Calls `AlgorithmFactory.run_algorithm()` with validated data
4. Returns algorithm result as JSON response
5. Catches exceptions and returns 500 error

```python
def post(self, request):
    serializer = ErrorDetectionRequestSerializer(data=request.data)
    if serializer.is_valid():
        params = serializer.validated_data
        result = AlgorithmFactory.run_algorithm(
            technique=params['technique'],
            data=params['data'],
            generator=params.get('generator'),
            introduce_error=params['introduce_error']
        )
        return Response(result, status=200)
    return Response(serializer.errors, status=400)
```

---

### Algorithm Factory
**File**: `apps/error_detection/services/algorithm_factory.py`

**Purpose**: Routes technique selection to appropriate algorithm implementation

**Method**: `AlgorithmFactory.run_algorithm(technique, data, **kwargs)`

**Routing**:
```python
technique.lower() → Function
'vrc'      → run_vrc(data, introduce_error)
'lrc'      → run_lrc(data, introduce_error)
'crc'      → run_crc(data, generator, introduce_error)
'checksum' → run_checksum(data, introduce_error)
```

**Parameters**:
- `technique`: Algorithm identifier (lowercase)
- `data`: Binary string
- `introduce_error`: Boolean (from kwargs)
- `generator`: Binary string (CRC only, from kwargs)

**Returns**: Dictionary matching response schema

---

### Service Modules

#### StepTracker
**File**: `apps/error_detection/services/step_tracker.py`

**Purpose**: Logs execution steps for frontend visualization

**Class**: `StepTracker`

**Methods**:
```python
__init__() → None
add_step(title: str, description: str, state: dict = None) → None
get_steps() → List[dict]
```

**Internal Structure**:
```python
steps = [
  {
    "title": "Sender: Bit 0",
    "description": "Found '1'. Current count: 1",
    "state": {"index": 0, "bit": "1", "count": 1, "action": "increment"}
  }
]
```

**Usage Pattern** (All algorithms):
```python
tracker = StepTracker()
tracker.add_step("Start VRC", f"Input Data: {data}")
# ... algorithm logic ...
tracker.add_step("Result", explanation, state={"error_detected": error_detected})
return {"steps": tracker.get_steps(), ...}
```

#### BitUtils
**File**: `apps/error_detection/services/bit_utils.py`

**Functions**:

1. **`xor(a: str, b: str) → str`**
   - Bitwise XOR on equal-length binary strings
   - Returns result as binary string
   - Used by CRC division
   
2. **`calculate_parity(bits: str) → str`**
   - Returns `'1'` if odd number of 1s, else `'0'`
   - Manual counting (no built-in functions)

**Implementation**:
```python
def xor(a, b):
    res = []
    for i in range(len(b)):
        if a[i] == b[i]:
            res.append('0')
        else:
            res.append('1')
    return "".join(res)
```

---

## Algorithm Implementation Details

### VRC (Vertical Redundancy Check)
**File**: `apps/error_detection/algorithms/vrc.py`

**Function**: `run_vrc(data: str, introduce_error: bool = False) → dict`

**Process**:

1. **Sender Side**:
   - Iterate through data bits
   - Count number of `'1'` bits
   - For each bit:
     - Log step with state: `{"index": i, "bit": bit, "count": ones_count, "action": "increment"|"skip"}`
   - Calculate parity: `'1'` if count is odd, else `'0'` (even parity)
   - Append parity bit to data
   - State: `{"data": data, "parity": parity_bit}`

2. **Channel**:
   - If `introduce_error=True`: Flip bit at index 0
   - `received_data = flipped_bit + transmitted_data[1:]`
   - Logs error injection with before/after

3. **Receiver Side**:
   - Separate data part: `received_data[:-1]`
   - Extract received parity: `received_data[-1]`
   - Recalculate parity from data part
   - Compare: `error_detected = (calc_parity != rec_parity)`

**Step State Keys**:
- `index`: Current bit position
- `bit`: Current bit value ('0' or '1')
- `count`: Running count of 1s
- `action`: "increment" | "skip"
- `parity`: Calculated parity bit
- `error_detected`: Final result

**Example Transmitted Data**:
- Input: `"11010110"`
- Count of 1s: 5 (odd)
- Parity: `'1'`
- Transmitted: `"110101101"`

---

### LRC (Longitudinal Redundancy Check)
**File**: `apps/error_detection/algorithms/lrc.py`

**Function**: `run_lrc(data: str, introduce_error: bool = False) → dict`

**Process**:

1. **Blocking**:
   - Determine block size: 4 bits if `len(data) ≤ 16`, else 8 bits
   - Pad with trailing zeros to align to block size
   - Split into blocks: `blocks = [data[i:i+block_size] for i in range(0, len(data), block_size)]`

2. **Sender Side**:
   - For each column index (0 to block_size-1):
     - Extract column bits: `[blocks[row][col] for row in range(len(blocks))]`
     - Count 1s in column
     - Calculate parity: `'1'` if odd, else `'0'`
     - State: `{"highlight_col": col, "column_bits": [...], "count": ones_count, "parity_bit": parity, "blocks": blocks}`
   - Concatenate column parities → LRC block
   - Append LRC block to data

3. **Channel**: Error injection at index 0 if enabled

4. **Receiver Side**:
   - Split received data into blocks (including LRC block)
   - For each column: count 1s across ALL blocks (data + LRC)
   - Compute parity for each column
   - Result should be all `'0'` if no error (even parity including LRC)
   - `error_detected = not all(c == '0' for c in final_check)`

**Step State Keys**:
- `blocks`: List of binary strings (each block)
- `highlight_col`: Current column index being processed
- `column_bits`: List of bits in current column
- `count`: 1s count in column
- `parity_bit`: Calculated parity for column

**Example**:
- Input: `"11010110"` (8 bits)
- Block size: 8 (since len > 16 is false, use 4... wait, code says `if n <= 16: block_size = 4`)
- Block size: 4
- Blocks: `["1101", "0110"]`
- Column 0: `['1', '0']` → 1 one → parity `'1'`
- Column 1: `['1', '1']` → 2 ones → parity `'0'`
- Column 2: `['0', '1']` → 1 one → parity `'1'`
- Column 3: `['1', '0']` → 1 one → parity `'1'`
- LRC Block: `"1011"`
- Transmitted: `"11010110" + "1011"` = `"110101101011"`

---

### CRC (Cyclic Redundancy Check)
**File**: `apps/error_detection/algorithms/crc.py`

**Function**: `run_crc(data: str, generator: str = "1001", introduce_error: bool = False) → dict`

**Process**:

1. **Sender Side**:
   - Append zeros: `appended_data = data + '0' * (len(generator) - 1)`
   - Perform modulo-2 division: `remainder = mod2div(appended_data, generator)`
   - Encoded data: `data + remainder`

2. **mod2div Algorithm**:
   - **Binary Polynomial Division** (XOR-based):
   - Start with first `len(divisor)` bits as `tmp`
   - Loop while bits remain to pull down:
     - If `tmp[0] == '1'`: XOR `tmp` with `divisor` → `result`
       - State: `{"current_chunk": tmp, "divisor": divisor, "xor_result": result, "next_bit": next_bit, "action": "xor"}`
       - New tmp: `result[1:] + next_bit`
     - Else: Skip XOR (shift)
       - State: `{"current_chunk": tmp, "next_bit": next_bit, "action": "skip"}`
       - New tmp: `tmp[1:] + next_bit`
   - Final XOR if needed
   - Return remainder: `tmp[1:]`

3. **Channel**: Error injection at index 0

4. **Receiver Side**:
   - Divide received data by generator
   - Check remainder: should be all `'0'` if no error
   - `error_detected = not all(c == '0' for c in check_remainder)`

**Step State Keys** (mod2div):
- `dividend`: Full data being divided
- `divisor`: Generator polynomial
- `current_chunk`: Current window of bits
- `xor_result`: Result after XOR operation
- `remainder`: Final remainder
- `action`: "start" | "xor" | "skip" | "final_xor" | "final_skip"
- `next_bit`: Bit pulled down from dividend

**Example**:
- Input: `"1101"`, Generator: `"101"`
- Append: `"1101" + "00"` = `"110100"`
- Division steps (modulo-2):
  1. `110` XOR `101` = `011`, pull `1` → `011 1`
  2. `0111` → skip, pull `0` → `111 0`
  3. `1110` XOR `101` → `0110`, pull `0` → `110 0`
  4. `1100` XOR `101` → `001` → remainder `01`
- Transmitted: `"1101" + "01"` = `"110101"`

---

### Checksum
**File**: `apps/error_detection/algorithms/checksum.py`

**Function**: `run_checksum(data: str, introduce_error: bool = False) → dict`

**Process**:

1. **Blocking**:
   - Block size: 4 if `len(data) ≤ 16`, else 8
   - Pad with **leading zeros** (LEFT padding): `processed_data = '0' * padding + data`
   - Split into blocks

2. **Sender Side - Summation**:
   - Initialize sum: `current_sum = blocks[0]`
   - For each remaining block:
     - Add using `full_adder(current_sum, block)` → `(temp_sum, carry)`
     - While carry exists:
       - Wrap around: `full_adder(temp_sum, '1'.zfill(block_size))` → `(s2, c2)`
       - State: `{"operand1": temp_sum, "carry_added": 1, "result": s2, "action": "wrap"}`
     - Update current_sum
   - Calculate checksum: `ones_complement(current_sum)`
   - State: `{"sum": current_sum, "checksum": checksum, "action": "complement"}`

3. **full_adder Function**:
   - Adds two equal-length binary strings
   - Iterates RIGHT to LEFT (LSB to MSB)
   - Binary addition with carry:
     ```
     bit_a + bit_b + carry = total
     total=0 → bit='0', carry=0
     total=1 → bit='1', carry=0
     total=2 → bit='0', carry=1
     total=3 → bit='1', carry=1
     ```
   - Returns: `(result_string, carry_out_bit)`

4. **ones_complement Function**:
   - Flips all bits: `'0' → '1'`, `'1' → '0'`

5. **Transmitted Data**: `processed_data + checksum`

6. **Channel**: Error injection at index 0

7. **Receiver Side**:
   - Separate: `rec_checksum = received_data[-block_size:]`, `rec_data = received_data[:-block_size]`
   - Sum all data blocks (same logic as sender)
   - Add received checksum to sum
   - Wrap carry if generated
   - Final sum should be all `'1'`s
   - `error_detected = not all(b == '1' for b in final_sum)`

**Step State Keys**:
- `blocks`: List of binary blocks
- `current_sum`: Running sum
- `operand1`, `operand2`: Operands in addition
- `result`: Addition result
- `carry`: Carry bit (0 or 1)
- `action`: "init" | "add" | "wrap" | "complement"
- `sum`: Final sum before complement
- `checksum`: 1s complement of sum

**Example**:
- Input: `"11010110"` (8 bits)
- Block size: 4
- Padding: Already 8 bits, no padding needed
- Blocks: `["1101", "0110"]`
- Sum: `1101 + 0110 = 0011` (carry 1)
- Wrap carry: `0011 + 0001 = 0100`
- Checksum (1s comp): `~0100 = 1011`
- Transmitted: `"11010110" + "1011"` = `"110101101011"`

---

## Frontend Architecture

### Directory Structure
```
frontend/
├── public/              # Static assets
├── src/
│   ├── main.jsx         # React entry point
│   ├── App.jsx          # Root component
│   ├── index.css        # Global Tailwind directives
│   ├── App.css          # Additional styles
│   └── components/
│       ├── ErrorVisualizer.jsx   # Main form & control panel
│       ├── ResultDisplay.jsx     # Results & step player
│       └── StepVisualizers.jsx   # Technique-specific visualizations
├── index.html           # HTML template
├── vite.config.js       # Vite bundler config
├── tailwind.config.js   # Tailwind CSS config
└── package.json         # Dependencies
```

### Component Hierarchy
```
App
└── ErrorVisualizer
    └── ResultDisplay
        ├── DataVisualizer (multiple instances)
        ├── BitBox (rendered by DataVisualizer)
        └── Step Visualizers (conditionally rendered)
            ├── VRCLevel
            ├── LRCLevel
            ├── CRCLevel
            └── ChecksumLevel
```

---

## UI Component Breakdown

### App.jsx
**File**: `frontend/src/App.jsx`

**Purpose**: Root component, provides layout structure

**Responsibilities**:
- Renders header with title and description
- Renders `<ErrorVisualizer />` as main content
- Provides footer
- Applies Tailwind classes for dark theme background

**State**: None (stateless wrapper)

**Styling**:
- Dark background with gradient
- Centered container (`max-w-6xl`)
- Indigo/cyan gradient accent on title

---

### ErrorVisualizer.jsx
**File**: `frontend/src/components/ErrorVisualizer.jsx`

**Purpose**: Input form, API communication, control panel

**React State**:
```javascript
const [technique, setTechnique] = useState('vrc')           // string
const [data, setData] = useState('11010110')                // string
const [generator, setGenerator] = useState('1001')          // string
const [introduceError, setIntroduceError] = useState(false) // boolean
const [loading, setLoading] = useState(false)               // boolean
const [result, setResult] = useState(null)                  // object | null
const [error, setError] = useState(null)                    // string | null
```

**Constants**:
```javascript
const TECHNIQUES = [
  { id: 'vrc', name: 'VRC', fullName: 'Vertical Redundancy Check' },
  { id: 'lrc', name: 'LRC', fullName: 'Longitudinal Redundancy Check' },
  { id: 'crc', name: 'CRC', fullName: 'Cyclic Redundancy Check' },
  { id: 'checksum', name: 'Checksum', fullName: 'Checksum' }
]
```

**Form Submission Flow** (`handleSubmit`):
```javascript
1. e.preventDefault()
2. setLoading(true), clear error/result
3. Build payload object:
   {
     technique: string,
     data: string,
     introduce_error: boolean,
     generator: string | undefined  // only if technique === 'crc'
   }
4. fetch('http://127.0.0.1:8000/api/detect-error/', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify(payload)
   })
5. Parse response as JSON
6. If !response.ok: throw Error(resData.detail || JSON.stringify(resData))
7. setResult(resData)
8. Catch errors: setError(err.message)
9. Finally: setLoading(false)
```

**Input Validation** (Client-side):
- Data input: `onChange` uses regex replace `/[^01]/g` → only allows 0s and 1s
- Generator input: Same regex validation
- Both are `required` HTML attributes

**Conditional Rendering**:
```javascript
{technique === 'crc' && (
  <input 
    value={generator}
    onChange={...}
    required
  />
)}
```
Animated slide-in when CRC is selected.

**Layout**:
- Grid layout: `grid lg:grid-cols-12`
- Left panel (4 cols): Controls, sticky position
- Right panel (8 cols): `<ResultDisplay />` or placeholder

**UI Elements**:
1. **Technique Selector**: 2x2 grid of buttons
   - Active state: Indigo background, white text, shadow
   - Inactive: Slate background, gray text
   - Shows full name below buttons

2. **Data Input**: Text field with `0b` prefix icon
   - Monospace font, wide letter spacing
   - Focus glow effect (indigo)

3. **Generator Input** (CRC only): Similar to data input

4. **Error Toggle**: Custom checkbox styled as toggle switch
   - Peer-checked states for animation
   - Label explains purpose

5. **Submit Button**:
   - Disabled when loading or no data
   - Shows spinner when loading
   - Icon + "Simulate Transmission" label

6. **Error Display**: Red alert box (if error exists)

---

### ResultDisplay.jsx
**File**: `frontend/src/components/ResultDisplay.jsx`

**Purpose**: Displays algorithm results, step-by-step player

**Props**:
```javascript
{
  result: {
    original_data: string,
    transmitted_data: string,
    received_data: string,
    error_detected: boolean,
    steps: Array<{title, description, state}>,
    explanation: string
  },
  technique: string  // 'vrc' | 'lrc' | 'crc' | 'checksum'
}
```

**React State**:
```javascript
const [currentStep, setCurrentStep] = useState(0)    // number
const [isPlaying, setIsPlaying] = useState(false)    // boolean
```

**Refs**:
```javascript
const stepContainerRef = useRef(null)  // For potential scrolling
```

**Effects**:

1. **Reset on Result Change**:
   ```javascript
   useEffect(() => {
     setCurrentStep(0)
     setIsPlaying(false)
   }, [result])
   ```

2. **Auto-Play Animation**:
   ```javascript
   useEffect(() => {
     if (isPlaying && currentStep < result.steps.length - 1) {
       interval = setInterval(() => {
         setCurrentStep(prev => prev + 1)
       }, 2000)  // 2 second delay between steps
     } else if (currentStep >= result.steps.length - 1) {
       setIsPlaying(false)
     }
     return () => clearInterval(interval)
   }, [isPlaying, currentStep, result])
   ```

**Computed Values**:

**diffIndices** (Error highlighting):
```javascript
const diffIndices = []
if (transmitted_data && received_data) {
  for (let i = 0; i < max(lengths); i++) {
    if (transmitted_data[i] !== received_data[i]) {
      diffIndices.push(i)
    }
  }
}
```
Used to highlight error bits with red styling in `DataVisualizer`.

**step** (Current step object):
```javascript
const step = result.steps[currentStep] || {}
```

**Rendering Logic**:

1. **Data Sections** (Top):
   - Original data (single row)
   - Transmitted & Received (two columns)
   - Received data highlights `diffIndices` in red

2. **Status Banner**:
   - Green gradient if `!error_detected`
   - Red gradient if `error_detected`
   - Icon (checkmark or alert)
   - Shows `result.explanation`

3. **Step Player** (Interactive walkthrough):
   - **Header Controls**:
     - Previous button: `setCurrentStep(max(0, currentStep - 1))`
     - Step counter: `{currentStep + 1} / {steps.length}`
     - Next button: `setCurrentStep(min(steps.length - 1, currentStep + 1))`
     - Play/Pause toggle: `setIsPlaying(!isPlaying)`
   - **Progress Bar**: Width = `((currentStep + 1) / steps.length) * 100%`
   - **Main Stage**:
     - Displays `step.title` (large heading)
     - Displays `step.description` (explanation text)
     - Calls `renderVisualizer()` to show technique-specific visualization

**renderVisualizer() Function**:
```javascript
switch (technique) {
  case 'vrc':
    return <VRCLevel step={step} />;
  case 'lrc':
    return <LRCLevel step={step} />;
  case 'crc':
    return <CRCLevel step={step} />;
  case 'checksum':
    return <ChecksumLevel step={step} />;
  default:
    return <pre>{JSON.stringify(step.state, null, 2)}</pre>;
}
```
Passes current `step` object to specialized visualizer component.

**Animation**:
- Step content has `key={currentStep}` to trigger re-animation on change
- Classes: `animate-in fade-in zoom-in-95 duration-300`

---

### Sub-Components in ResultDisplay

#### DataVisualizer
**Purpose**: Renders a labeled row of binary bits

**Props**:
```javascript
{
  data: string,                 // Binary string
  diffIndices: number[] = [],   // Indices to mark as errors
  label: string,                // Title label
  highlightIndices: number[] = [] // Custom highlights
}
```

**Rendering**:
```javascript
data.split('').map((bit, idx) => {
  let type = 'default'
  if (diffIndices.includes(idx)) type = 'error'
  if (highlightIndices.includes(idx)) type = 'highlight'
  return <BitBox bit={bit} type={type} label={idx} />
})
```

#### BitBox
**Purpose**: Renders a single bit with styling

**Props**:
```javascript
{
  bit: string,        // '0' or '1'
  type: string,       // 'default' | 'error' | 'parity' | 'valid' | 'highlight'
  label: string       // Small label below (usually index)
}
```

**Styling by Type**:
- `default`: Gray background, slate border
- `error`: Red background, pulsing animation, glow
- `parity`: Amber background, glow
- `valid`: Green background, glow
- `highlight`: Cyan background, scaled up, glow

**DOM Structure**:
```html
<div class="flex flex-col items-center gap-1 group">
  <div class="w-10 h-10 flex items-center justify-center rounded-lg border-2 font-mono text-xl font-bold {colorClass} {glow}">
    {bit}
  </div>
  {label && <span class="text-[10px] uppercase tracking-wider text-slate-500">{label}</span>}
</div>
```

---

### StepVisualizers.jsx
**File**: `frontend/src/components/StepVisualizers.jsx`

**Purpose**: Technique-specific step visualization components

**Shared Utility Components**:

#### Mono
```javascript
const Mono = ({ children, className = "" }) => (
  <span className={`font-mono ${className}`}>{children}</span>
)
```

#### BitGrid
```javascript
const BitGrid = ({ bits, highlightIdx = -1, colorMap = {} }) => {
  return bits.split('').map((b, i) => {
    let colorClass = "bg-slate-800 text-slate-400 border-slate-700";
    if (highlightIdx === i) colorClass = "indigo highlight...";
    if (colorMap[i]) colorClass = colorMap[i];
    return <div class="w-8 h-8 {colorClass}">{b}</div>
  })
}
```

---

### VRCLevel Component

**File**: `frontend/src/components/StepVisualizers.jsx`

**Props**: `{ step }`

**Expected State Keys**:
```javascript
{
  index: number,      // Current bit position
  bit: string,        // '0' or '1'
  count: number,      // Running count of 1s
  action: string,     // "increment" | "skip"
  parity: string      // Final parity bit
}
```

**Rendering Logic**:

1. **If action is "increment" or "skip"**:
   - Display current bit (large, cyan color)
   - Progress bar (colored based on bit value)
   - Grid showing:
     - Position: `state.index`
     - Ones Count: `state.count` (with Even/Odd label)

2. **If parity exists**:
   - Large amber box with parity bit
   - Glow effect
   - Labeled "Calculated Parity Bit"

**DOM Example**:
```html
<div class="flex flex-col items-center gap-6">
  <div class="text-xl font-mono">
    Current Bit: <span class="text-cyan-400 text-3xl">{state.bit}</span>
  </div>
  <div class="grid grid-cols-2 gap-8 text-center">
    <div class="p-4 bg-slate-800/50 rounded-xl">
      <div class="text-xs text-slate-500">Position</div>
      <div class="text-2xl font-mono">{state.index}</div>
    </div>
    <div class="p-4 bg-slate-800/50 rounded-xl">
      <div class="text-xs text-slate-500">Ones Count</div>
      <div class="text-2xl font-mono">{state.count}</div>
      <div class="text-xs text-slate-400">{state.count % 2 === 0 ? 'Even' : 'Odd'}</div>
    </div>
  </div>
</div>
```

---

### LRCLevel Component

**Props**: `{ step }`

**Expected State Keys**:
```javascript
{
  blocks: string[],        // Array of binary blocks
  highlight_col: number,   // Current column index
  column_bits: string[],   // Bits in current column
  count: number,           // 1s in current column
  parity_bit: string       // Parity for current column
}
```

**Rendering**:

1. **Block Grid**:
   - Renders all blocks as 2D grid
   - Each block is a row
   - Each bit is a cell (10x10 rounded square)
   - Column `highlight_col` is highlighted (indigo glow, scaled)

2. **Parity Row** (if `parity_bit` exists):
   - Rendered below blocks with border separator
   - Shows parity bit only for `highlight_col` position
   - Other positions are transparent

3. **Column Info Banner**:
   - Shows: `Column {highlight_col} | 1s Count: {count} | Odd/Even`

**DOM Structure**:
```html
<div class="flex flex-col gap-1">
  {blocks.map(block => (
    <div class="flex gap-1">
      {block.split('').map((bit, cIdx) => (
        <div class="w-10 h-10 {isColActive ? 'bg-indigo-500/30 border-indigo-500 scale-105' : 'bg-slate-800/40 border-slate-700'}">
          {bit}
        </div>
      ))}
    </div>
  ))}
  
  <!-- Parity Row -->
  <div class="flex gap-1 mt-2 pt-2 border-t border-slate-700/50">
    {blocks[0].split('').map((_, cIdx) => (
      <div class="w-10 h-10 {isTarget ? 'bg-amber-500/20 border-amber-500' : 'bg-transparent'}">
        {isTarget ? state.parity_bit : ''}
      </div>
    ))}
  </div>
</div>
```

---

### CRCLevel Component

**Props**: `{ step }`

**Expected State Keys**:
```javascript
{
  dividend: string,       // Full data being divided
  divisor: string,        // Generator polynomial
  current_chunk: string,  // Current window of bits
  xor_result: string,     // Result after XOR
  remainder: string,      // Final remainder
  action: string,         // "xor" | "skip" | "final_xor" | "final_skip" | "start"
  next_bit: string,       // Bit pulled down
  new_chunk: string       // Chunk after operation
}
```

**Rendering**:

Shows modulo-2 division step:

1. **Current Chunk** (top, white text)
2. **XOR label** (if action includes "xor")
3. **Divisor** (cyan, with underline border)
4. **XOR Result** (green, animated slide-in)
5. **OR Remainder** (amber, boxed) if final step
6. **Meta Info** (bottom): Shows action and next bit

**DOM Structure**:
```html
<div class="bg-slate-900/50 p-6 rounded-xl font-mono">
  <div class="flex flex-col gap-2 items-center text-lg">
    <div class="tracking-[0.2em] text-white">{state.current_chunk}</div>
    
    {isXor && (
      <>
        <div class="text-slate-600">XOR</div>
        <div class="tracking-[0.2em] text-cyan-400 border-b border-slate-600 pb-2">
          {state.divisor}
        </div>
      </>
    )}
    
    {state.xor_result && (
      <div class="tracking-[0.2em] text-emerald-400 animate-in slide-in-from-top-2">
        {state.xor_result}
      </div>
    )}
    
    {state.remainder && !state.xor_result && (
      <div class="tracking-[0.2em] text-amber-400 p-2 border-2 border-amber-500/30 rounded bg-amber-500/10">
        Remainder: {state.remainder}
      </div>
    )}
  </div>
  
  <div class="flex justify-between text-xs text-slate-500 mt-4 border-t border-slate-800 pt-4">
    <span>Action: <span class="text-slate-300">{state.action}</span></span>
    {state.next_bit && <span>Pull Down: <span class="text-white">{state.next_bit}</span></span>}
  </div>
</div>
```

---

### ChecksumLevel Component

**Props**: `{ step }`

**Expected State Keys** (varies by action):
```javascript
// For action="init" or blocks display:
{
  blocks: string[],
  action: "init"
}

// For action="add" or action="wrap":
{
  operand1: string,
  operand2: string,
  result: string,
  carry: number,  // 0 or 1
  action: "add" | "wrap"
}

// For action="complement":
{
  sum: string,
  checksum: string,
  action: "complement"
}
```

**Rendering by Action**:

1. **"init" or blocks**:
   - Flex wrap of block boxes
   - Each block in slate-colored rounded container

2. **"add" or "wrap"**:
   - Vertical stack showing addition:
     ```
     operand1
     + operand2  (or "+ 1 (Carry)" for wrap)
     ─────────
     result
     [Carry indicator if carry=1]
     ```
   - Result in green
   - Carry shown as amber badge

3. **"complement"**:
   - Two-stage display:
     - Top: Sum in gray box
     - Arrow: "↓ 1s Complement ↓"
     - Bottom: Checksum in indigo glowing box (large, bold)

**DOM Examples**:

**Addition**:
```html
<div class="flex flex-col items-center gap-2 font-mono text-xl">
  <div class="text-slate-400">{state.operand1}</div>
  <div class="flex items-center gap-2 border-b border-slate-600 pb-2">
    <span class="text-slate-600">+</span>
    <span class="text-slate-400">{state.operand2}</span>
  </div>
  <div class="text-emerald-400 font-bold">{state.result}</div>
  {state.carry == 1 && (
    <div class="text-xs text-amber-500 px-2 py-1 bg-amber-500/10 rounded border border-amber-500/30">
      Carry Out Generated
    </div>
  )}
</div>
```

**Complement**:
```html
<div class="flex flex-col items-center gap-4">
  <div class="p-4 bg-slate-800 rounded-xl flex flex-col items-center gap-2">
    <span class="text-xs text-slate-500">Sum</span>
    <span class="font-mono text-xl text-slate-300">{state.sum}</span>
  </div>
  <div class="text-slate-500">↓ 1s Complement ↓</div>
  <div class="p-4 bg-indigo-900/40 border border-indigo-500/50 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.2)]">
    <span class="text-xs text-indigo-300 uppercase tracking-widest">Checksum</span>
    <span class="font-mono text-2xl text-white font-bold tracking-widest">{state.checksum}</span>
  </div>
</div>
```

---

## Data Flow & API Contracts

### Complete Request-Response Cycle

#### 1. User Interaction
**Component**: `ErrorVisualizer.jsx`

User fills form:
```javascript
technique: "crc"
data: "110101"
generator: "1011"
introduce_error: true
```

Clicks "Simulate Transmission" → triggers `handleSubmit()`

---

#### 2. Request Construction
**Location**: `ErrorVisualizer.jsx` - `handleSubmit()`

```javascript
const payload = {
  technique: "crc",
  data: "110101",
  introduce_error: true,
  generator: "1011"  // Included only if technique === 'crc'
}

fetch('http://127.0.0.1:8000/api/detect-error/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
})
```

**HTTP Request**:
```
POST /api/detect-error/ HTTP/1.1
Host: 127.0.0.1:8000
Content-Type: application/json
Origin: http://localhost:5173

{"technique":"crc","data":"110101","introduce_error":true,"generator":"1011"}
```

---

#### 3. Backend Reception
**File**: `apps/error_detection/api/views.py`

Django processes POST request:
1. CORS middleware allows origin
2. Routes to `DetectErrorView.post()`
3. Passes `request.data` to serializer

---

#### 4. Validation
**File**: `apps/error_detection/api/serializers.py`

```python
serializer = ErrorDetectionRequestSerializer(data=request.data)
serializer.is_valid()  # Performs validation
```

**Validation Steps**:
1. `technique`: Must be in `['vrc', 'lrc', 'crc', 'checksum']`
2. `data`: Must match regex `^[01]+$`
3. `generator`: Must match regex `^[01]+$` (if present)
4. `introduce_error`: Coerced to boolean
5. Custom validation: If CRC, generator is required

**If Invalid**:
```python
return Response(serializer.errors, status=400)
```

Response example:
```json
{
  "data": ["Data must contain only 0s and 1s."],
  "generator": ["Generator polynomial is required for CRC."]
}
```

---

#### 5. Algorithm Execution
**File**: `apps/error_detection/services/algorithm_factory.py`

```python
params = serializer.validated_data
# params = {
#   'technique': 'crc',
#   'data': '110101',
#   'generator': '1011',
#   'introduce_error': True
# }

result = AlgorithmFactory.run_algorithm(
    technique=params['technique'],        # 'crc'
    data=params['data'],                  # '110101'
    generator=params.get('generator'),    # '1011'
    introduce_error=params['introduce_error']  # True
)
```

Factory routes to `run_crc('110101', '1011', True)`

---

#### 6. CRC Algorithm Execution
**File**: `apps/error_detection/algorithms/crc.py`

**Execution Flow**:

1. Initialize tracker: `tracker = StepTracker()`
2. Log start: `tracker.add_step("Start CRC", f"Data: 110101, Generator: 1011")`
3. Sender:
   - Append zeros: `"110101" + "000"` → `"110101000"` (3 zeros for 4-bit generator)
   - Call `mod2div("110101000", "1011", tracker, "Sender")`
   - Perform division, logging each XOR/skip step
   - Get remainder: e.g., `"010"`
   - Encoded: `"110101" + "010"` → `"110101010"`
4. Channel:
   - If introduce_error: Flip bit 0 → `"010101010"`
   - Log: `tracker.add_step("Channel: Error Injection", "Bit 0 flipped. 110101010 -> 010101010")`
5. Receiver:
   - Call `mod2div("010101010", "1011", tracker, "Receiver")`
   - Get remainder: e.g., `"101"` (non-zero)
6. Check: `is_zero = all(c == '0' for c in "101")` → `False`
7. Error detected: `True`
8. Return result

---

#### 7. Response Construction
**File**: `apps/error_detection/algorithms/crc.py` (return statement)

```python
return {
  "original_data": "110101",
  "transmitted_data": "110101010",
  "received_data": "010101010",
  "error_detected": True,
  "steps": [
    {
      "title": "Start CRC",
      "description": "Data: 110101, Generator: 1011",
      "state": {}
    },
    {
      "title": "Sender: Padding",
      "description": "Appended 3 zeros: 110101000",
      "state": {}
    },
    {
      "title": "Sender: Div Start",
      "description": "Dividend: 110101000, Divisor: 1011, Initial Chunk: 1101",
      "state": {
        "dividend": "110101000",
        "divisor": "1011",
        "current_chunk": "1101",
        "action": "start"
      }
    },
    {
      "title": "Sender: Step (XOR)",
      "description": "Current: 1101 (Starts with 1). XOR 1011 -> 0110. Pull down 0 -> New: 0110",
      "state": {
        "current_chunk": "1101",
        "divisor": "1011",
        "xor_result": "0110",
        "next_bit": "0",
        "new_chunk": "1100",
        "action": "xor"
      }
    },
    // ... more division steps ...
    {
      "title": "Sender: Finalize",
      "description": "CRC Remainder: 010. Transmitted: 110101010",
      "state": {}
    },
    {
      "title": "Channel: Error Injection",
      "description": "Bit 0 flipped. 110101010 -> 010101010",
      "state": {}
    },
    {
      "title": "Receiver: Verification",
      "description": "Dividing Received Data by Generator...",
      "state": {}
    },
    // ... receiver division steps ...
    {
      "title": "Result",
      "description": "Final Remainder: 101. Error Detected: True",
      "state": {}
    }
  ],
  "explanation": "Detected error via non-zero remainder"
}
```

---

#### 8. HTTP Response
**File**: `apps/error_detection/api/views.py`

```python
return Response(result, status=status.HTTP_200_OK)
```

**HTTP Response**:
```
HTTP/1.1 200 OK
Content-Type: application/json
Access-Control-Allow-Origin: http://localhost:5173

{
  "original_data": "110101",
  "transmitted_data": "110101010",
  "received_data": "010101010",
  "error_detected": true,
  "steps": [...],
  "explanation": "Detected error via non-zero remainder"
}
```

---

#### 9. Frontend Response Handling
**File**: `frontend/src/components/ErrorVisualizer.jsx`

```javascript
const resData = await response.json()

if (!response.ok) {
  throw new Error(resData.detail || JSON.stringify(resData))
}

setResult(resData)  // Updates state
setLoading(false)
```

**State Update**:
```javascript
result = {
  original_data: "110101",
  transmitted_data: "110101010",
  received_data: "010101010",
  error_detected: true,
  steps: Array(15),  // 15 step objects
  explanation: "Detected error via non-zero remainder"
}
```

---

#### 10. UI Re-render
**Component**: `ErrorVisualizer.jsx`

State change triggers re-render:

```jsx
{result ? (
  <ResultDisplay result={result} technique={technique} />
) : (
  <placeholder />
)}
```

Passes `result` object and `technique="crc"` to `ResultDisplay`.

---

#### 11. ResultDisplay Initialization
**File**: `frontend/src/components/ResultDisplay.jsx`

**Effect Triggers on New Result**:
```javascript
useEffect(() => {
  setCurrentStep(0)       // Reset to first step
  setIsPlaying(false)     // Stop auto-play
}, [result])
```

**Renders**:
1. **DataVisualizer** for original data
2. **DataVisualizer** for transmitted/received (with error highlighting)
   - Computes `diffIndices`:
     ```javascript
     transmitted: "110101010"
     received:    "010101010"
     diffIndices: [0]  // Bit 0 differs
     ```
3. **Status Banner**: Red with "Transmission Error Detected"
4. **Step Player**: Shows step 1/15, controls, first step content

---

#### 12. Step Visualization
**Current Step**: 3 (Sender: Step XOR)

**Step Object**:
```javascript
{
  title: "Sender: Step (XOR)",
  description: "Current: 1101 (Starts with 1). XOR 1011 -> 0110. Pull down 0 -> New: 1100",
  state: {
    current_chunk: "1101",
    divisor: "1011",
    xor_result: "0110",
    next_bit: "0",
    new_chunk: "1100",
    action: "xor"
  }
}
```

**renderVisualizer()** switches on `technique="crc"`:
```javascript
return <CRCLevel step={step} />
```

**CRCLevel Renders**:
```
┌─────────────────────────┐
│       1101              │  (current_chunk, white)
│        XOR              │
│       1011              │  (divisor, cyan, underlined)
│       ────              │
│       0110              │  (xor_result, green, animated)
│                         │
│ Action: XOR             │
│ Pull Down: 0            │
└─────────────────────────┘
```

---

#### 13. User Interaction - Step Navigation

User clicks **Next** button:
```javascript
onClick={() => {
  setIsPlaying(false)
  setCurrentStep(Math.min(result.steps.length - 1, currentStep + 1))
}}
```

State updates: `currentStep: 3 → 4`

**Triggers Re-render**:
- New `step` object loaded
- `key={currentStep}` on content container forces re-animation
- `CRCLevel` renders with new state

User clicks **Play**:
```javascript
onClick={() => setIsPlaying(!isPlaying)}
```

**Auto-Play Effect Activates**:
```javascript
interval = setInterval(() => {
  setCurrentStep(prev => prev + 1)
}, 2000)
```

Steps advance every 2 seconds until end reached.

---

## State Management & Rendering

### Frontend State Summary

**ErrorVisualizer State**:
```javascript
{
  technique: 'vrc' | 'lrc' | 'crc' | 'checksum',
  data: string,                // Binary, regex validated
  generator: string,           // Binary, for CRC
  introduceError: boolean,
  loading: boolean,            // True during API call
  result: object | null,       // API response
  error: string | null         // Error message
}
```

**ResultDisplay State**:
```javascript
{
  currentStep: number,         // 0 to steps.length - 1
  isPlaying: boolean           // Auto-play animation state
}
```

### State Flow Diagram
```
User Input → Local State Update (onChange)
            ↓
Form Submit → loading=true, error=null, result=null
            ↓
API Call → Fetch to Django backend
            ↓
Response → loading=false, result=data OR error=message
            ↓
Conditional Render → ResultDisplay if result exists
                    ↓
                  Step Navigation (local state)
                    ↓
                  Visualizer Component (props)
```

### Rendering Performance Notes

1. **Key Prop for Animation**: `key={currentStep}` on step content forces React to unmount/remount, triggering CSS animations

2. **Conditional Rendering**: Generator input only renders when `technique === 'crc'` to reduce DOM size

3. **Debounced Input**: Input validation happens on `onChange`, but no API call until submit

4. **Auto-Play Interval**: Cleaned up in effect return to prevent memory leaks

5. **Responsive Grid**: `lg:grid-cols-12` collapses to single column on mobile

---

## Error Handling

### Backend Errors

**Validation Errors** (400):
```json
{
  "data": ["Data must contain only 0s and 1s."],
  "technique": ["\"xyz\" is not a valid choice."]
}
```

**Server Errors** (500):
```json
{
  "error": "division by zero"
}
```

### Frontend Error Display

**Location**: `ErrorVisualizer.jsx`

```jsx
{error && (
  <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-200 rounded-xl text-sm animate-pulse">
    <strong>Error:</strong> {error}
  </div>
)}
```

Displays below control panel, clears on new submission.

---

## Summary: Key Data Types & Contracts

### API Request
```typescript
{
  technique: "vrc" | "lrc" | "crc" | "checksum",
  data: string,              // Regex: ^[01]+$
  generator?: string,        // Required for CRC, regex: ^[01]+$
  introduce_error: boolean
}
```

### API Response
```typescript
{
  original_data: string,
  transmitted_data: string,
  received_data: string,
  error_detected: boolean,
  steps: Array<{
    title: string,
    description: string,
    state: {
      // VRC: index, bit, count, action, parity
      // LRC: blocks, highlight_col, column_bits, count, parity_bit
      // CRC: dividend, divisor, current_chunk, xor_result, remainder, action, next_bit
      // Checksum: blocks, operand1, operand2, result, carry, action, sum, checksum
    }
  }>,
  explanation: string
}
```

### Component Props
```typescript
// ErrorVisualizer
props: {}  // No props

// ResultDisplay
props: {
  result: APIResponse,
  technique: string
}

// DataVisualizer
props: {
  data: string,
  diffIndices?: number[],
  label: string,
  highlightIndices?: number[]
}

// VRCLevel | LRCLevel | CRCLevel | ChecksumLevel
props: {
  step: {
    title: string,
    description: string,
    state: object
  }
}
```

---

## File Responsibilities Matrix

| File | Responsibility | Input | Output |
|------|---------------|-------|--------|
| `config/urls.py` | Route `/api/` to app | URL path | View function |
| `api/urls.py` | Route `/detect-error/` | URL path | `DetectErrorView` |
| `api/serializers.py` | Validate request | JSON dict | Validated dict or errors |
| `api/views.py` | Handle HTTP, orchestrate | HTTP Request | HTTP Response (JSON) |
| `algorithm_factory.py` | Route technique to algorithm | Technique string, data | Algorithm result dict |
| `vrc.py` | VRC algorithm logic | Data, error flag | Result dict with steps |
| `lrc.py` | LRC algorithm logic | Data, error flag | Result dict with steps |
| `crc.py` | CRC algorithm logic | Data, generator, error flag | Result dict with steps |
| `checksum.py` | Checksum logic | Data, error flag | Result dict with steps |
| `step_tracker.py` | Log execution steps | Title, desc, state | Steps array |
| `bit_utils.py` | Binary operations | Binary strings | Computed values |
| `ErrorVisualizer.jsx` | Form UI, API calls | User input | Result state |
| `ResultDisplay.jsx` | Display results, step player | Result object | Rendered visualization |
| `StepVisualizers.jsx` | Technique-specific step visuals | Step object | DOM elements |

---

## Visual Data Flow Chart

```
┌─────────────────────────────────────────────────────────────────┐
│ Frontend (React @ localhost:5173)                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ErrorVisualizer.jsx                                            │
│  ┌───────────────────────────────────────────┐                 │
│  │ State: technique, data, generator,        │                 │
│  │        introduceError, loading, result    │                 │
│  └───────────────┬───────────────────────────┘                 │
│                  │                                              │
│                  │ handleSubmit()                               │
│                  ▼                                              │
│          fetch('http://127.0.0.1:8000/api/detect-error/')      │
│          POST {technique, data, introduce_error, generator?}   │
│                  │                                              │
└──────────────────┼──────────────────────────────────────────────┘
                   │
                   │ HTTP Request (JSON)
                   │
┌──────────────────▼──────────────────────────────────────────────┐
│ Backend (Django @ 127.0.0.1:8000)                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  CORS Middleware → Allow Origin                                │
│          ▼                                                      │
│  urls.py → /api/detect-error/ → DetectErrorView                │
│          ▼                                                      │
│  views.py → DetectErrorView.post()                             │
│          │                                                      │
│          ├─→ ErrorDetectionRequestSerializer                   │
│          │   ├─ Validate technique (choice)                    │
│          │   ├─ Validate data (regex ^[01]+$)                  │
│          │   ├─ Validate generator (regex, required for CRC)   │
│          │   └─ Coerce introduce_error (bool)                  │
│          │                                                      │
│          ├─→ AlgorithmFactory.run_algorithm()                  │
│          │          ▼                                           │
│          │   Switch technique:                                 │
│          │    ├─ 'vrc' → run_vrc()                             │
│          │    ├─ 'lrc' → run_lrc()                             │
│          │    ├─ 'crc' → run_crc()                             │
│          │    └─ 'checksum' → run_checksum()                   │
│          │                                                      │
│          │   Algorithm Execution:                              │
│          │    ├─ Initialize StepTracker                        │
│          │    ├─ Sender: Calculate parity/CRC/checksum         │
│          │    │   └─ Log each iteration with state             │
│          │    ├─ Channel: Inject error if flag set             │
│          │    └─ Receiver: Verify data                         │
│          │        └─ Log verification steps                    │
│          │                                                      │
│          │   Return Dictionary:                                │
│          │   {original_data, transmitted_data, received_data,  │
│          │    error_detected, steps[], explanation}            │
│          │                                                      │
│          └─→ Response(result, status=200)                      │
│                  │                                              │
└──────────────────┼──────────────────────────────────────────────┘
                   │
                   │ HTTP Response (JSON)
                   │
┌──────────────────▼──────────────────────────────────────────────┐
│ Frontend (React)                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ErrorVisualizer.jsx                                            │
│          │                                                      │
│          ├─→ setResult(resData)                                │
│          └─→ setLoading(false)                                 │
│                  │                                              │
│                  │ State Update Triggers Re-render              │
│                  ▼                                              │
│          ResultDisplay.jsx                                      │
│          ┌──────────────────────────────────────┐              │
│          │ Props: result, technique             │              │
│          │ State: currentStep=0, isPlaying=false│              │
│          └──────────┬───────────────────────────┘              │
│                     │                                           │
│                     ├─→ Compute diffIndices                    │
│                     ├─→ Render DataVisualizers                 │
│                     ├─→ Render Status Banner                   │
│                     └─→ Render Step Player                     │
│                             │                                   │
│                             ├─→ Display step.title             │
│                             ├─→ Display step.description       │
│                             └─→ renderVisualizer()             │
│                                     │                           │
│                                     ├─ VRCLevel                │
│                                     ├─ LRCLevel                │
│                                     ├─ CRCLevel                │
│                                     └─ ChecksumLevel           │
│                                           │                     │
│                                           └─→ Render state     │
│                                               visualization    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Complete Execution Example (VRC with Error)

### Input
```json
{
  "technique": "vrc",
  "data": "1101",
  "introduce_error": true
}
```

### Backend Execution

1. **Validation**: Pass (all fields valid)

2. **Sender Calculation**:
   - Data: `"1101"`
   - Bit 0 (`'1'`): count=1 → Log step: `{index:0, bit:'1', count:1, action:'increment'}`
   - Bit 1 (`'1'`): count=2 → Log step: `{index:1, bit:'1', count:2, action:'increment'}`
   - Bit 2 (`'0'`): count=2 → Log step: `{index:2, bit:'0', count:2, action:'skip'}`
   - Bit 3 (`'1'`): count=3 → Log step: `{index:3, bit:'1', count:3, action:'increment'}`
   - Parity: count=3 (odd) → `'1'`
   - Transmitted: `"11011"`

3. **Channel**: Flip bit 0 → `"01011"`

4. **Receiver**:
   - Data part: `"0101"`
   - Received parity: `'1'`
   - Count 1s in `"0101"`: 2 (even)
   - Expected parity: `'0'`
   - Received parity: `'1'`
   - Mismatch → Error detected

5. **Response**:
```json
{
  "original_data": "1101",
  "transmitted_data": "11011",
  "received_data": "01011",
  "error_detected": true,
  "steps": [
    {"title": "Start VRC", "description": "Input Data: 1101", "state": {}},
    {"title": "Sender: Counting 1s", "description": "Iterating through bits...", "state": {}},
    {"title": "Sender: Bit 0", "description": "Found '1'. Current count: 1", "state": {"index": 0, "bit": "1", "count": 1, "action": "increment"}},
    {"title": "Sender: Bit 1", "description": "Found '1'. Current count: 2", "state": {"index": 1, "bit": "1", "count": 2, "action": "increment"}},
    {"title": "Sender: Bit 2", "description": "Found '0'. Current count: 2", "state": {"index": 2, "bit": "0", "count": 2, "action": "skip"}},
    {"title": "Sender: Bit 3", "description": "Found '1'. Current count: 3", "state": {"index": 3, "bit": "1", "count": 3, "action": "increment"}},
    {"title": "Sender: Parity Calculation", "description": "Total 1s: 3. 3 is Odd. Parity Bit: 1", "state": {"data": "1101", "parity": "1"}},
    {"title": "Channel: Error Injection", "description": "Noise introduced! Bit 0 flipped. 11011 -> 01011", "state": {}},
    {"title": "Receiver: Start Check", "description": "Received Data: 01011", "state": {}},
    {"title": "Receiver: Verification", "description": "Count of 1s in data part: 2. Expected Parity: 0. Received Parity: 1.", "state": {}},
    {"title": "Result", "description": "Error Detected: Parity mismatch.", "state": {"error_detected": true}}
  ],
  "explanation": "Error Detected: Parity mismatch."
}
```

### Frontend Rendering

1. **ErrorVisualizer**: Updates `result` state
2. **ResultDisplay**: Renders with `currentStep=0`
3. **DataVisualizers**:
   - Original: `1101`
   - Transmitted: `11011`
   - Received: `01011` (bit 0 highlighted red)
4. **Status Banner**: Red gradient, "Transmission Error Detected"
5. **Step Player**: Shows "Start VRC" step
6. **User clicks Next**: Step 3 (Sender: Bit 0)
7. **VRCLevel**: Renders:
   ```
   Current Bit: 1
   ──────────────
   Position: 0
   Ones Count: 1 (Odd)
   ```
8. **Continues through steps**: Visualization updates per step state
9. **Final step**: Shows error detected result

---

This comprehensive documentation covers every technical aspect of your error detection visualizer project, from the exact data types and field names to the detailed flow of information through each component and file.
