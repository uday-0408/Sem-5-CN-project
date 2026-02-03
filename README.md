# CN: Error Detection Techniques Visualization Platform

A professional full-stack educational project visualizing data link layer error detection algorithms. Built with Django (Backend) and React.js (Frontend).

## 🚀 Features

- **Manual Implementation**: Core algorithms (VRC, LRC, CRC, Checksum) implemented from scratch using bitwise logic.
- **Interactive Visualization**: Step-by-step playback of the error detection process.
- **Simulation**: Ability to inject errors during transmission to test detection capabilities.
- **Premium UI**: Modern, glassmorphism-inspired interface using Tailwind CSS.

## 🛠 Tech Stack

### Backend
- **Framework**: Django & Django REST Framework (DRF)
- **Language**: Python 3.x
- **Key Constraints**: No built-in validation libraries; manual bit manipulation.

### Frontend
- **Framework**: React.js (Vite)
- **Styling**: Tailwind CSS, Custom CSS Animations.
- **State Management**: React Hooks.

## 📚 Algorithms Implemented

### 1. VRC (Vertical Redundancy Check)
Also known as Parity Check. Appends a parity bit to ensure the total number of 1s is even (or odd).
- **Pros**: Simple to implement.
- **Cons**: Cannot detect even number of bit changes.

### 2. LRC (Longitudinal Redundancy Check)
Organizes data into blocks and calculates parity for each column.
- **Pros**: Better than VRC, detects burst errors.
- **Cons**: Failed if patterns overlap in specific ways.

### 3. CRC (Cyclic Redundancy Check)
Uses binary division (modulo-2 arithmetic). The remainder is appended to data.
- **Pros**: Highly robust, standard in Ethernet/WiFi.
- **Cons**: Computational overhead.

### 4. Checksum
Sums data segments (1s complement addition) and appends the complement.
- **Pros**: Good for software implementation (TCP/IP).
- **Cons**: Slightly weaker than CRC for some patterns.

## ⚙️ Setup Instructions

### Prerequisites
- Python 3.8+
- Node.js & npm

### Backend Setup
1. Navigate to the project root.
2. Create virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # Windows: .\venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r cn_error_visualizer/requirements.txt
   ```
4. Run the server:
   ```bash
   cd cn_error_visualizer
   python manage.py runserver
   ```
   Backend runs at: `http://127.0.0.1:8000/`

### Frontend Setup
1. Navigate to frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
   Frontend runs at: `http://localhost:5173/`

## 🧪 Usage

1. Open the frontend URL.
2. Select an algorithm (e.g., CRC).
3. Enter binary data (e.g., `110101`).
4. (Optional) Toggle "Simulate Transmission Error".
5. Click **Simulate Transmission**.
6. Use the playback controls to walk through the algorithm steps.

## 🎓 Educational Note
This project demonstrates the internal working of network protocols. The "Steps" section in the UI reveals the exact arithmetic operations (XOR, Carry Wrap, Parity Count) performed by the network interface cards (NICs) in real hardware.
