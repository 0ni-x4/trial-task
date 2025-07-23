import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowUpCircle, ChevronDown, ChevronUp, Highlighter } from 'lucide-react';
import Image from 'next/image';
import { FC, useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Highlight } from './EssayEditor';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  highlights?: Highlight[];
}

interface CounselorChatProps {
  essay: string;
  suggestions: any[];
  onHighlight?: (highlights: Highlight[]) => void;
  initialMessages?: Array<{
    id: string;
    role: string;
    content: string;
    highlights: Highlight[];
    createdAt: string;
  }>;
  onSaveMessage?: (role: string, content: string, highlights?: Highlight[]) => void;
}

export const CounselorChat: FC<CounselorChatProps> = ({
  essay,
  suggestions,
  onHighlight,
  initialMessages,
  onSaveMessage,
}) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [expandedHighlights, setExpandedHighlights] = useState<{ [key: number]: boolean }>({});
  const collapsed = messages.length >= 2;

  // Initialize messages from database
  useEffect(() => {
    if (initialMessages && initialMessages.length > 0) {
      const formattedMessages: Message[] = initialMessages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        highlights: msg.highlights.length > 0 ? msg.highlights : undefined,
      }));
      setMessages(formattedMessages);
      console.log('🔄 Loaded', formattedMessages.length, 'previous messages from database');
    }
  }, [initialMessages]);

  const commonQuestions = [
    'Is my hook strong enough?',
    'If you were admissions, would you accept this?',
    'What part of my essay is the weakest?',
    'Are there any grammar issues?',
  ];

  // Analyze question to determine highlight types
  const analyzeQuestionType = (
    question: string
  ): 'positive' | 'negative' | 'warning' | 'neutral' => {
    const lowerQuestion = question.toLowerCase();

    // Negative/critical questions
    if (
      lowerQuestion.includes('weak') ||
      lowerQuestion.includes('worst') ||
      lowerQuestion.includes('bad') ||
      lowerQuestion.includes('problem') ||
      lowerQuestion.includes('issue') ||
      lowerQuestion.includes('wrong') ||
      lowerQuestion.includes('error')
    ) {
      return 'negative';
    }

    // Warning/improvement questions
    if (
      lowerQuestion.includes('improve') ||
      lowerQuestion.includes('better') ||
      lowerQuestion.includes('fix') ||
      lowerQuestion.includes('grammar') ||
      lowerQuestion.includes('unclear') ||
      lowerQuestion.includes('confusing')
    ) {
      return 'warning';
    }

    // Positive questions
    if (
      lowerQuestion.includes('best') ||
      lowerQuestion.includes('strong') ||
      lowerQuestion.includes('good') ||
      lowerQuestion.includes('great') ||
      lowerQuestion.includes('excellent') ||
      lowerQuestion.includes('impressive')
    ) {
      return 'positive';
    }

    return 'neutral';
  };

  // Get color for highlight type
  const getHighlightColor = (type: string) => {
    switch (type) {
      case 'positive':
        return 'bg-green-400';
      case 'negative':
        return 'bg-red-400';
      case 'warning':
        return 'bg-yellow-400';
      case 'neutral':
        return 'bg-teal-400';
      default:
        return 'bg-gray-400';
    }
  };

  // Split message into sentences for bubble effect
  const splitIntoSentences = (text: string): string[] => {
    return text
      .split(/(?<=[.!?])\s+/)
      .filter(sentence => sentence.trim().length > 0)
      .map(sentence => sentence.trim());
  };

  const sendQuestion = async (question: string) => {
    if (!question.trim()) return;

    // Add user message to UI and save to database
    const userMessage = { role: 'user' as const, content: question };
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    // Save user message to database
    if (onSaveMessage) {
      onSaveMessage('user', question);
    }

    try {
      setIsTyping(true);

      // Analyze the question type
      const questionType = analyzeQuestionType(question);
      console.log('🔍 Question type analyzed:', questionType);
      console.log('📝 Sending ONLY current essay content (length:', essay.length, 'characters)');
      console.log('📝 Essay preview:', essay.substring(0, 100) + '...');
      console.log('🚫 NOT sending chat history - counselor only sees current essay');

      const res = await fetch('/api/counselor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          essay, // ONLY current essay content - no history of any kind
          suggestions,
          question,
          // chatHistory: messages, // REMOVED - counselor gets no conversation history
          requestHighlights: true,
          highlightType: questionType,
        }),
      });
      const data = await res.json();

      // Debug: Log the full API response
      console.log('🔍 API Response:', data);
      console.log('🔍 Highlights from API:', data.highlights);
      console.log('🔍 onHighlight callback exists:', !!onHighlight);

      // Prepare highlights for storage
      let responseHighlights: Highlight[] = [];

      // Set highlights immediately when response comes back (REPLACE old highlights)
      if (onHighlight) {
        if (data.highlights && data.highlights.length > 0) {
          console.log('🎯 Replacing highlights with new ones:', data.highlights);
          responseHighlights = data.highlights;
          onHighlight(data.highlights);
        } else if (data.highlight) {
          // Backward compatibility: convert single highlight to array format
          console.log(
            '🎯 Converting single highlight to array format and replacing:',
            data.highlight
          );
          const highlights: Highlight[] = [
            {
              text: data.highlight,
              type: questionType,
            },
          ];
          responseHighlights = highlights;
          onHighlight(highlights);
        } else {
          // Clear highlights if no new ones are provided
          console.log('🧹 Clearing highlights - no new highlights in response');
          onHighlight([]);
        }
      } else {
        console.log('❌ No highlight callback available');
      }

      // Split the response into sentences and add them as separate messages
      const sentences = splitIntoSentences(data.answer || 'Sorry, no answer.');

      // Add sentences one by one with a slight delay
      for (let i = 0; i < sentences.length; i++) {
        setTimeout(() => {
          const assistantMessage = {
            role: 'assistant' as const,
            content: sentences[i],
            // Only add highlights to the first sentence/message of the response
            highlights: i === 0 && responseHighlights.length > 0 ? responseHighlights : undefined,
          };

          setMessages(prev => [...prev, assistantMessage]);

          // Save assistant message to database
          if (onSaveMessage) {
            onSaveMessage('assistant', sentences[i], assistantMessage.highlights);
          }

          if (i === sentences.length - 1) {
            setIsTyping(false);
          }
        }, i * 800); // 800ms delay between each sentence
      }
    } catch (err) {
      console.error('❌ API Error:', err);
      setIsTyping(false);
    }
  };

  const toggleHighlights = (messageIndex: number) => {
    setExpandedHighlights(prev => ({
      ...prev,
      [messageIndex]: !prev[messageIndex],
    }));
  };

  return (
    <Card className="p-2 rounded-[20px] flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Greeting Section */}
      {!collapsed && (
        <div className="flex flex-col items-center text-center mb-6 p-3">
          <div className="w-24 h-24 rounded-full bg-[#00AE96] flex items-center justify-center mb-4">
            <Image
              src="/ivy.png"
              alt="Ivy Avatar"
              width={72}
              height={72}
              className="rounded-full"
            />
          </div>
          <h2 className="text-lg font-semibold mb-1">Hey there, I'm Ivy!</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            Your AI counselor for college essays.
            <br />I analyze your current essay and provide you with feedback!
          </p>
        </div>
      )}

      {collapsed && (
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-[#00AE96] flex items-center justify-center">
            <Image
              src="/ivy.png"
              alt="Ivy Avatar"
              width={32}
              height={32}
              className="rounded-full"
            />
          </div>
          <h2 className="text-sm font-semibold">Ivy</h2>
        </div>
      )}

      {/* Common Questions (only before chat starts) */}
      {messages.length === 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold mb-3">Common questions</h3>
          <div className="space-y-2">
            {commonQuestions.map(q => (
              <button
                key={q}
                className="w-full text-left p-2 bg-muted/50 rounded-full text-sm hover:bg-muted"
                onClick={() => sendQuestion(q)}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat messages */}
      {messages.length > 0 && (
        <ScrollArea className="flex-1 mb-4 pr-3 rounded-[5px]">
          <div className="space-y-4">
            {messages.map((m, i) => {
              if (m.role === 'assistant') {
                return (
                  <div key={i} className="text-left">
                    <div className="inline-block bg-muted px-2 py-2 rounded-lg text-sm max-w-[85%]">
                      {/* Highlighted text dropdown - only show if highlights exist */}
                      {m.highlights && m.highlights.length > 0 && (
                        <div className="mb-2">
                          <button
                            onClick={() => toggleHighlights(i)}
                            className="inline-flex bg-white items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-background/50 border border-border w-full justify-between"
                          >
                            <div className="flex items-center gap-1">
                              <Highlighter className="w-3 h-3 text-teal-500" />
                              Highlighted text ({m.highlights.length})
                            </div>
                            {expandedHighlights[i] ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                          </button>

                          {/* Expanded highlights */}
                          {expandedHighlights[i] && (
                            <div className="mt-2 space-y-1 border-t border-border/40 pt-2">
                              {m.highlights.map((highlight, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-start gap-2 p-2 rounded-md bg-background/50 cursor-pointer hover:bg-background/70 transition-colors"
                                  onClick={() => {
                                    if (onHighlight) {
                                      console.log(
                                        '🔄 Re-applying highlights from message:',
                                        m.highlights
                                      );
                                      onHighlight(m.highlights!);
                                    }
                                  }}
                                >
                                  <div
                                    className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${getHighlightColor(highlight.type)}`}
                                  ></div>
                                  <div className="text-xs">
                                    <div className="font-medium capitalize text-foreground">
                                      {highlight.type}
                                    </div>
                                    <div className="text-muted-foreground mt-0.5 line-clamp-2">
                                      "{highlight.text}"
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      <span className="whitespace-pre-wrap">{m.content}</span>
                    </div>
                  </div>
                );
              }
              return (
                <div key={i} className="text-right px-1">
                  <p className="inline-block bg-teal-500 text-white px-3 py-2 rounded-lg text-sm text-left max-w-[85%] whitespace-pre-wrap">
                    {m.content}
                  </p>
                </div>
              );
            })}
            {isTyping && (
              <div className="text-left">
                <p className="inline-block bg-muted px-3 py-2 rounded-lg text-sm max-w-[85%] opacity-70">
                  Ivy is typing...
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      )}

      {/* Spacer when no messages to push input down */}
      {messages.length === 0 && <div className="flex-1" />}

      {/* Input */}
      <div className="relative mt-2">
        <Input
          placeholder="Ask a question..."
          className="pr-10 focus-visible:ring-0"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              sendQuestion(input);
            }
          }}
        />
        <ArrowUpCircle
          className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 text-[#00AE96] cursor-pointer"
          onClick={() => sendQuestion(input)}
        />
      </div>
    </Card>
  );
};
