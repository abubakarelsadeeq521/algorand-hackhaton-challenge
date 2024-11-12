# Algorand Pera Wallet Integration

A web application demonstrating seamless integration with Pera Wallet for the Algorand blockchain, featuring atomic swaps, verified assets management, and multi-account support.

## 🏆 Project Achievements

✅ **Core Features**
- Full Pera Wallet integration with multi-account support
- Network switching between Mainnet and Testnet
- Real-time transaction status updates
- Verified assets display with logos and details
- Asset opt-in functionality
- Atomic swap implementation
- Responsive and intuitive UI

✅ **Enhanced Features**
- Transaction analytics and history
- Asset verification status indicators
- Improved error handling and user feedback
- Loading states and animations
- Clean and modern UI design

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Pera Wallet mobile app

### Installation
```bash
# Clone the repository
git clone [repository-url]

# Install dependencies
npm install

# Start development server
npm run dev
🎮 Navigation Guide
1. Wallet Connection
Click "Connect with Pera Wallet" button
Scan QR code with Pera mobile app
Select account if multiple accounts available
2. Network Selection
Toggle between Mainnet/Testnet using network selector
Network status displayed in header
3. Asset Management
View verified assets with logos and details
Click "Opt In" to opt into an asset
Select assets for atomic swaps
Monitor transaction status in real-time
4. Atomic Swap
Select asset for swap
Enter swap details
Confirm transaction in Pera Wallet
Monitor swap status
🔍 Implementation Details
API Integration
Pera Connect for wallet connection
Algorand SDK for transactions
Pera Public API for verified assets
Technical Stack
React with TypeScript
TailwindCSS for styling
Algorand JavaScript SDK
Pera Connect library
Security Features
Secure transaction signing
Network validation
Error boundary implementation
Input validation
🧪 Testing
# Run tests
npm test

# Run e2e tests
npm run test:e2e

📚 Additional Resources
Pera Wallet Documentation
Algorand Developer Docs
API Reference
🤝 Contributing
Feel free to submit issues and enhancement requests.

📝 License
This project is licensed under the MIT License - see the LICENSE file for details.

🏗 Architecture
src/
├── components/         # React components
├── hooks/             # Custom hooks
├── utils/             # Utility functions
├── types/             # TypeScript types
└── services/          # API services
