import React, { useState, useEffect } from 'react';
import { type Workspace } from '../shared';

interface WorkspacePrimerProps {
  workspace: Workspace | null;
  onUpdate: (primer: string) => void;
}

interface PrimerTemplate {
  id: string;
  name: string;
  description: string;
  content: string;
}

const PRIMER_TEMPLATES: PrimerTemplate[] = [
  {
    id: 'ai_architect',
    name: 'AI Architect',
    description: 'Technical, terse, with code and complexity analysis',
    content: `Be terse, technical, with code and complexity analysis. Prefer TypeScript/Go examples. Cite algorithms, data structures, and design patterns. Focus on:
- Time/space complexity (Big O notation)
- Architectural decisions and trade-offs
- Performance implications
- Scalability considerations
- Code quality and maintainability
- Industry best practices

Response format: Technical summary, implementation details, optimization opportunities.`,
  },
  {
    id: 'layla_novella',
    name: 'Layla (Novella)',
    description: 'Lyrical SF style with metaphors and scientific plausibility',
    content: `Write in lyrical science fiction style. Harvest metaphors from the content. Preserve scientific plausibility while maintaining poetic language. Channel the voice of a thoughtful SF novelist:
- Use evocative, metaphorical language
- Draw parallels between technical concepts and natural phenomena
- Maintain scientific accuracy within poetic expression
- Create narrative threads that illuminate understanding
- Balance technical depth with literary beauty
- Find the human story within the data

Response format: Metaphor-rich summary, scientific poetry, narrative insights.`,
  },
  {
    id: 'music_theory',
    name: 'Music Theory',
    description: 'Analysis via intervals, modes, and functional harmony',
    content: `Explain content through musical theory concepts. Use intervals, modes, functional harmony, and performance techniques. For relevant content, provide fretboard shapes or keyboard patterns:
- Analyze structures as harmonic progressions
- Identify patterns as scales, modes, or chord progressions
- Relate concepts to musical intervals and relationships
- Suggest practical applications on instruments
- Use musical terminology and notation concepts
- Connect abstract ideas to physical music-making

Response format: Musical analysis, harmonic relationships, practical applications.`,
  },
  {
    id: 'body_os',
    name: 'BodyOS',
    description: 'Health-focused with macros, habits, and optimization',
    content: `Summarize content into health and fitness actionables. Focus on macros, protein intake, fiber content, and habit loop formation. Treat the body as an optimizable system:
- Convert information into nutritional guidelines
- Propose specific habit loops and behavioral triggers
- Quantify health metrics and tracking opportunities
- Suggest meal timing and macro distribution
- Identify stress factors and recovery protocols
- Create actionable wellness interventions

Response format: Nutritional breakdown, habit stack recommendations, health optimizations.`,
  },
];

const WorkspacePrimer: React.FC<WorkspacePrimerProps> = ({
  workspace,
  onUpdate,
}) => {
  const [primer, setPrimer] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<number | null>(null);

  // Load primer when workspace changes
  useEffect(() => {
    if (workspace?.contextPrimer) {
      setPrimer(workspace.contextPrimer);
    } else {
      setPrimer('');
    }
  }, [workspace?.id, workspace?.contextPrimer]);

  // Auto-save primer changes with debouncing
  useEffect(() => {
    if (!workspace || primer === (workspace.contextPrimer || '')) {
      return; // No changes to save
    }

    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }

    const timeout = setTimeout(() => {
      onUpdate(primer);
    }, 1000) as unknown as number;

    setAutoSaveTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [primer, workspace, onUpdate, autoSaveTimeout]);

  const handleTemplateSelect = (template: PrimerTemplate) => {
    setPrimer(template.content);
    setShowTemplates(false);
  };

  const handleClearPrimer = () => {
    setPrimer('');
  };

  if (!workspace) {
    return null;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <svg
            className="w-4 h-4 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
          <h3 className="text-sm font-medium text-blue-900">AI Primer</h3>
          <span className="text-xs text-blue-600">
            • Shapes how AI analyzes content for this workspace
          </span>
        </div>

        <div className="flex items-center space-x-1">
          {/* Templates dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center space-x-1"
              title="Choose from templates"
            >
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17v4a2 2 0 002 2h4M13 13h3a2 2 0 012 2v1M13 13l-2-2-2 2"
                />
              </svg>
              <span>Templates</span>
            </button>

            {showTemplates && (
              <div className="absolute right-0 top-full mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                <div className="p-2 border-b border-gray-100">
                  <div className="text-xs font-medium text-gray-700">
                    Choose a primer template:
                  </div>
                </div>
                {PRIMER_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateSelect(template)}
                    className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="font-medium text-sm text-gray-900 mb-1">
                      {template.name}
                    </div>
                    <div className="text-xs text-gray-600 mb-2">
                      {template.description}
                    </div>
                    <div className="text-xs text-gray-500 line-clamp-2">
                      {template.content.substring(0, 120)}...
                    </div>
                  </button>
                ))}
                <div className="p-2 border-t border-gray-100">
                  <button
                    onClick={() => setShowTemplates(false)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Close templates
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Clear button */}
          {primer && (
            <button
              onClick={handleClearPrimer}
              className="text-xs p-1 text-blue-600 hover:text-blue-800 transition-colors"
              title="Clear primer"
            >
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Primer editor */}
      <textarea
        value={primer}
        onChange={(e) => setPrimer(e.target.value)}
        placeholder="Define how AI should analyze content for this workspace... e.g., 'Focus on technical implementation details and provide code examples' or 'Explain concepts using musical metaphors and theory'"
        className="w-full h-20 p-2 text-xs border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none bg-white"
        style={{ fontSize: '11px', lineHeight: '1.4' }}
      />

      {/* Status indicator */}
      <div className="flex items-center justify-between mt-2">
        <div className="text-xs text-blue-600">
          {primer ? (
            <span className="flex items-center space-x-1">
              <svg
                className="w-3 h-3 text-green-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Custom primer active</span>
            </span>
          ) : (
            <span className="flex items-center space-x-1">
              <svg
                className="w-3 h-3 text-gray-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Using default analysis</span>
            </span>
          )}
        </div>
        <div className="text-xs text-gray-500">Auto-saves as you type</div>
      </div>

      {/* Click outside handler */}
      {showTemplates && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowTemplates(false)}
        />
      )}
    </div>
  );
};

export default WorkspacePrimer;
