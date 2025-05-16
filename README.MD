# ZeroCard Infra: Spend Your Crypto Like Cash

Welcome to ZeroCard Infra, the backbone of a revolutionary platform enabling users to spend cryptocurrency with the ease of traditional fiat. We provide a robust, secure, and scalable backend system for a frictionless crypto-to-fiat spending experience.

This is a sophisticated financial infrastructure, not just another crypto project, built for reliability and real-world usability.

## 🚀 Core Tenets

*   **🛡️ Security First:** Advanced cryptography, Privy for secure authentication, and ZeroDev for Smart Wallet security.
*   **⚙️ Robust & Scalable Architecture:** Modular NestJS design for high availability and growth.
*   **🔗 Seamless Blockchain Integration:** Real-time monitoring, transaction processing, and smart contract interaction, enhanced by **BlockRadar** for advanced chain analytics and security monitoring.
*   **💳 Innovative Card Engine:** Manages the lifecycle of virtual and physical cards, linking them to crypto wallets.

## 🏗️ Architecture Overview

The ZeroCard infrastructure is modular, ensuring scalability and separation of concerns.

```mermaid
graph TD
    A[User Mobile/Web App] --> B{ZeroCard API Gateway (NestJS)};
    B --> C[Auth Module (Privy)];
    B --> D[User Management Module];
    B --> E[Card Engine Module];
    B --> F[Transaction Processing Module];
    B --> G[KYC Module];
    B --> H[Notification Module];
    E --> I[External Card Issuers/Processors API];
    F --> J[Blockchain Interaction Layer (BlockRadar, ZeroDev)];
    J --> K[Supported Blockchains (e.g., Ethereum, Polygon)];
    J --> L[Smart Wallet Infrastructure (@zerodev/sdk)];
    M[Database (PostgreSQL)] <--> C;
    M <--> D;
    M <--> E;
    M <--> F;
    M <--> G;
    M <--> H;
```

**Flow:** Client apps interact with the NestJS API Gateway. Requests are routed to specialized modules (Auth via **Privy**, User Management, Card Engine, Transactions with **BlockRadar** insights, KYC). The system connects to external card issuers, blockchain networks (leveraging ZeroDev Smart Accounts), and a PostgreSQL database. Notifications and real-time updates are handled via Pusher.

## ✨ Key Functional Areas

Our infrastructure delivers comprehensive capabilities:

*   **User & Auth Management:** Secure user onboarding, authentication (**Privy**), and profile management.
*   **Card Lifecycle & Spending:** Full management of virtual/physical cards via our Card Engine, including creation, activation, and spending limits.
*   **Blockchain Operations & Transaction Processing:** Secure interaction with blockchains, smart account management (ZeroDev), transaction execution, and advanced monitoring/analytics with **BlockRadar**.
*   **Compliance & Notifications:** KYC processes and timely user notifications for important events.

## 🛠️ Technology Stack Highlights

*   **Framework**: NestJS (TypeScript)
*   **Database**: PostgreSQL (TypeORM)
*   **Authentication**: Privy (`@privy-io/server-auth`)
*   **Blockchain**: Ethers.js, Viem, `@zerodev/sdk`, **BlockRadar**
*   **API Documentation**: Swagger
*   **Testing**: Jest
*   **Real-time Updates**: Pusher

## 🏁 Quick Start & Operations Guide

### Prerequisites
*   Node.js (>=20.0.0), Yarn
*   PostgreSQL, Privy Account, Pusher Account

### Setup & Running
1.  **Clone & Install:**
    ```bash
    git clone <your-repository-url> && cd zerocard-infra
    yarn install
    ```
2.  **Configure Environment:**
    Copy `.env.example` to `.env` and fill in your credentials (DB, Privy, Pusher, JWT secrets, etc.).
3.  **Database Migrations:**
    ```bash
    yarn migration:run
    ```
4.  **Run Application:**
    *   Development: `yarn start:dev` (API on `http://localhost:<PORT>/api`)
    *   Production: `yarn build && yarn start:prod`
    *   Debug: `yarn start:debug`

### Testing
*   Run all tests: `yarn test`
*   Coverage: `yarn test:cov`
*   E2E tests: `yarn test:e2e`

### Code Quality
*   Lint & Fix: `yarn lint`
*   Format: `yarn format`

---

Building the future of finance, where crypto meets everyday spending.
