# Essay Assist - Standalone Next.js Project

This is a standalone Next.js project containing the essay-assist functionality extracted from the main Initializer application.

## Features

- AI-powered essay writing assistance
- Real-time feedback and suggestions
- Essay editing with version history
- Mobile-responsive design
- Modern UI with Radix UI components

## Project Structure

```
essay-assist/
├── app/
│   ├── api/essay-assist/           # API routes for essay assist
│   ├── essays/assist/              # Essay assist pages
│   ├── globals.css                 # Global styles
│   ├── layout.tsx                  # Root layout
│   └── page.tsx                    # Home page
├── components/
│   ├── essay-assist/               # Essay assist v1 components
│   ├── essay-assist-v2/            # Essay assist v2 components
│   └── ui/                         # Reusable UI components
├── hooks/
│   ├── use-assist-data-v2.ts       # V2 data management hook
│   ├── use-essay-assist-data.ts    # Essay assist data hook
│   ├── use-editor-state-v2.ts      # Editor state management
│   ├── use-essay-editing.ts        # Essay editing logic
│   ├── use-review-logic.ts         # Review generation logic
│   ├── use-review-generation.ts    # Review generation hook
│   ├── use-suggestion-tracking.ts  # Suggestion tracking
│   ├── use-suggestion-filtering.ts # Suggestion filtering
│   └── use-mobile.ts               # Mobile detection hook
├── lib/
│   ├── services/essay-assist/      # Essay assist services
│   ├── utils/
│   │   └── suggestion-filtering.ts # Utility functions
│   ├── db.ts                       # Database connection
│   └── utils.ts                    # General utilities
├── prisma/
│   └── schema.prisma               # Database schema
└── package.json                    # Dependencies
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- OpenAI API key

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd essay-assist
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your actual values:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/essay_assist_db"
OPENAI_API_KEY="your-openai-api-key-here"
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
```

4. Set up the database:
```bash
npx prisma generate
npx prisma db push
```

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Key Components

### Essay Assist V2 (Recommended)
- **Workspace**: Main editing interface
- **Editor**: Rich text editor with highlighting
- **Review Panel**: AI-powered feedback and suggestions
- **Chat**: Counselor chat interface

### Essay Assist V1 (Legacy)
- Original implementation with similar features
- Maintained for compatibility

## API Routes

- `GET/POST /api/essay-assist` - List/create essay assists
- `GET/PUT/DELETE /api/essay-assist/[id]` - Individual essay operations
- `POST /api/essay-assist/[id]/messages` - Chat messages
- `POST /api/essay-assist/[id]/apply-suggestion` - Apply suggestions
- `POST /api/essay-assist/review` - Generate reviews

## Database Models

### EssayAssist
- Core essay document with content, history, and metadata
- Tracks suggestions, reviews, and user interactions

### EssayAssistMessage
- Chat messages between user and AI counselor
- Includes highlight data for text annotations

### User
- Basic user model for authentication context

## Missing Dependencies

This standalone project includes stubs for:
- **Authentication**: Basic mock session (replace with real auth)
- **Plan Guards**: Removed - all features available
- **Database**: Uses Prisma with PostgreSQL
- **Analytics**: Removed tracking code

## Development Notes

### Authentication
The current implementation uses a mock session for development. To add real authentication:

1. Replace `auth.ts` with a proper auth implementation (NextAuth.js, Auth0, etc.)
2. Update the session structure to match your needs
3. Add proper user management

### Database
The project uses Prisma with PostgreSQL. The schema includes only the essential models for essay-assist functionality.

### AI Integration
The project uses OpenAI's GPT-4 for:
- Essay review and feedback
- Suggestion generation
- Counselor chat responses

## Building for Production

1. Build the application:
```bash
npm run build
```

2. Start the production server:
```bash
npm start
```

## License

This project is part of the Initializer application suite.
