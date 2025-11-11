import { useState } from 'react';
import { Trophy, TrendingUp, Zap, DollarSign, Target, Eye, EyeOff } from 'lucide-react';
import { diffWords, diffSentences } from 'diff';

interface ResponseMetrics {
  model: string;
  response: string;
  speed: number; // ms
  tokens: number;
  cost: number; // USD
  qualityScore: number;
}

interface ResponseAnalyzerProps {
  responses: ResponseMetrics[];
  onClose?: () => void;
}

/**
 * Advanced Response Analyzer
 * Compares model responses with visual diffs, quality scores, and winner determination
 */
export function ResponseAnalyzer({ responses, onClose }: ResponseAnalyzerProps) {
  const [showDiff, setShowDiff] = useState(true);
  const [diffMode, setDiffMode] = useState<'words' | 'sentences'>('words');
  const [selectedModels, setSelectedModels] = useState<[number, number]>([0, 1]);

  if (responses.length < 2) {
    return (
      <div className="p-8 text-center text-gray-500">
        Add at least 2 models to see comparison
      </div>
    );
  }

  // Calculate quality scores for each response
  const scoredResponses = responses.map(r => ({
    ...r,
    scores: calculateQualityScores(r.response),
    overallScore: calculateOverallScore(r),
  }));

  // Determine winner
  const winner = scoredResponses.reduce((best, current) =>
    current.overallScore > best.overallScore ? current : best
  );

  const model1 = scoredResponses[selectedModels[0]];
  const model2 = scoredResponses[selectedModels[1]];

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              Response Analysis
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Comparing {responses.length} model responses
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Diff Mode Toggle */}
            <button
              onClick={() => setShowDiff(!showDiff)}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              {showDiff ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              {showDiff ? 'Hide' : 'Show'} Diff
            </button>

            {showDiff && (
              <select
                value={diffMode}
                onChange={(e) => setDiffMode(e.target.value as 'words' | 'sentences')}
                className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg"
              >
                <option value="words">Word-level</option>
                <option value="sentences">Sentence-level</option>
              </select>
            )}

            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>

        {/* Model Selector */}
        <div className="mt-4 flex items-center gap-3">
          <span className="text-sm text-gray-600 dark:text-gray-400">Compare:</span>
          <select
            value={selectedModels[0]}
            onChange={(e) => setSelectedModels([parseInt(e.target.value), selectedModels[1]])}
            className="px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg"
          >
            {responses.map((r, i) => (
              <option key={i} value={i}>{r.model}</option>
            ))}
          </select>
          <span className="text-gray-400">vs</span>
          <select
            value={selectedModels[1]}
            onChange={(e) => setSelectedModels([selectedModels[0], parseInt(e.target.value)])}
            className="px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg"
          >
            {responses.map((r, i) => (
              <option key={i} value={i}>{r.model}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Winner Banner */}
      <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-b border-yellow-200 dark:border-yellow-800 p-4">
        <div className="flex items-center gap-3">
          <Trophy className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
          <div>
            <div className="font-bold text-gray-900 dark:text-white">
              Winner: {winner.model}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Overall score: {winner.overallScore.toFixed(1)}/100 •
              Best balance of quality, speed, and cost
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Metrics Comparison */}
        <MetricsComparison responses={scoredResponses} winner={winner} />

        {/* Visual Diff */}
        {showDiff && (
          <DiffViewer
            model1={model1}
            model2={model2}
            mode={diffMode}
          />
        )}

        {/* Detailed Quality Breakdown */}
        <QualityBreakdown responses={scoredResponses} />

        {/* Insights */}
        <Insights responses={scoredResponses} winner={winner} />
      </div>
    </div>
  );
}

// Metrics Comparison Card
function MetricsComparison({ responses, winner }: { responses: any[]; winner: any }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-blue-600" />
        Performance Metrics
      </h3>

      <div className="grid grid-cols-4 gap-4">
        {/* Speed */}
        <div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-1">
            <Zap className="w-4 h-4" />
            Speed
          </div>
          {responses.map((r) => (
            <div
              key={r.model}
              className={`mb-2 p-2 rounded ${
                r.model === winner.model && r.speed === Math.min(...responses.map(x => x.speed))
                  ? 'bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-700'
                  : 'bg-gray-50 dark:bg-gray-700/50'
              }`}
            >
              <div className="text-xs text-gray-600 dark:text-gray-400">{r.model}</div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                {(r.speed / 1000).toFixed(2)}s
              </div>
            </div>
          ))}
        </div>

        {/* Tokens */}
        <div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Tokens</div>
          {responses.map((r) => (
            <div key={r.model} className="mb-2 p-2 rounded bg-gray-50 dark:bg-gray-700/50">
              <div className="text-xs text-gray-600 dark:text-gray-400">{r.model}</div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                {r.tokens}
              </div>
            </div>
          ))}
        </div>

        {/* Cost */}
        <div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-1">
            <DollarSign className="w-4 h-4" />
            Cost
          </div>
          {responses.map((r) => (
            <div
              key={r.model}
              className={`mb-2 p-2 rounded ${
                r.cost === 0
                  ? 'bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-700'
                  : 'bg-gray-50 dark:bg-gray-700/50'
              }`}
            >
              <div className="text-xs text-gray-600 dark:text-gray-400">{r.model}</div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                {r.cost === 0 ? 'FREE' : `$${r.cost.toFixed(4)}`}
              </div>
            </div>
          ))}
        </div>

        {/* Quality Score */}
        <div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Quality</div>
          {responses.map((r) => (
            <div
              key={r.model}
              className={`mb-2 p-2 rounded ${
                r.model === winner.model
                  ? 'bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700'
                  : 'bg-gray-50 dark:bg-gray-700/50'
              }`}
            >
              <div className="text-xs text-gray-600 dark:text-gray-400">{r.model}</div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1">
                {r.scores.overall.toFixed(1)}/10
                {r.model === winner.model && <Trophy className="w-3 h-3 text-yellow-600" />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Visual Diff Viewer
function DiffViewer({ model1, model2, mode }: { model1: any; model2: any; mode: 'words' | 'sentences' }) {
  const diffs = mode === 'words'
    ? diffWords(model1.response, model2.response)
    : diffSentences(model1.response, model2.response);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Visual Diff: {model1.model} vs {model2.model}
      </h3>

      <div className="grid grid-cols-2 gap-4">
        {/* Model 1 */}
        <div>
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center justify-between">
            <span>{model1.model}</span>
            <span className="text-xs text-gray-500">
              {model1.response.length} chars
            </span>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 text-sm leading-relaxed max-h-[400px] overflow-y-auto">
            {diffs.map((part, i) => (
              <span
                key={i}
                className={
                  part.removed
                    ? 'bg-red-200 dark:bg-red-900/40 text-red-900 dark:text-red-200'
                    : part.added
                    ? ''
                    : 'text-gray-900 dark:text-gray-100'
                }
              >
                {part.removed ? part.value : (!part.added ? part.value : '')}
              </span>
            ))}
          </div>
        </div>

        {/* Model 2 */}
        <div>
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center justify-between">
            <span>{model2.model}</span>
            <span className="text-xs text-gray-500">
              {model2.response.length} chars
            </span>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 text-sm leading-relaxed max-h-[400px] overflow-y-auto">
            {diffs.map((part, i) => (
              <span
                key={i}
                className={
                  part.added
                    ? 'bg-green-200 dark:bg-green-900/40 text-green-900 dark:text-green-200'
                    : part.removed
                    ? ''
                    : 'text-gray-900 dark:text-gray-100'
                }
              >
                {part.added ? part.value : (!part.removed ? part.value : '')}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-200 dark:bg-red-900/40 rounded"></div>
          <span>Removed in {model2.model}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-200 dark:bg-green-900/40 rounded"></div>
          <span>Added in {model2.model}</span>
        </div>
      </div>
    </div>
  );
}

// Quality Breakdown
function QualityBreakdown({ responses }: { responses: any[] }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Quality Analysis
      </h3>

      <div className="space-y-4">
        {responses.map((r) => (
          <div key={r.model} className="border-l-4 border-blue-500 pl-4">
            <div className="font-medium text-gray-900 dark:text-white mb-2">{r.model}</div>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-gray-600 dark:text-gray-400">Length</div>
                <div className="font-semibold">{r.scores.length.toFixed(1)}/10</div>
              </div>
              <div>
                <div className="text-gray-600 dark:text-gray-400">Structure</div>
                <div className="font-semibold">{r.scores.structure.toFixed(1)}/10</div>
              </div>
              <div>
                <div className="text-gray-600 dark:text-gray-400">Readability</div>
                <div className="font-semibold">{r.scores.readability.toFixed(1)}/10</div>
              </div>
              <div>
                <div className="text-gray-600 dark:text-gray-400">Overall</div>
                <div className="font-semibold text-blue-600">{r.scores.overall.toFixed(1)}/10</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Insights
function Insights({ responses, winner }: { responses: any[]; winner: any }) {
  const insights = generateInsights(responses, winner);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        💡 Insights & Recommendations
      </h3>

      <div className="space-y-3">
        {insights.map((insight, i) => (
          <div
            key={i}
            className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
          >
            <div className="text-2xl">{insight.icon}</div>
            <div>
              <div className="font-medium text-gray-900 dark:text-white">{insight.title}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{insight.description}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Helper Functions

function calculateQualityScores(response: string) {
  // Length score (optimal 200-500 words)
  const wordCount = response.split(/\s+/).length;
  const lengthScore = wordCount < 50 ? 3 : wordCount < 200 ? 7 : wordCount <= 500 ? 10 : 8;

  // Structure score (paragraphs, formatting)
  const paragraphs = response.split('\n\n').filter(p => p.trim().length > 0).length;
  const hasBullets = response.includes('•') || response.includes('-') || response.includes('*');
  const hasNumbering = /\d+\./.test(response);
  const structureScore = paragraphs > 1 ? 8 : 6;
  const structureFinal = structureScore + (hasBullets || hasNumbering ? 2 : 0);

  // Readability score (sentence length, variety)
  const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const avgSentenceLength = response.length / sentences.length;
  const readabilityScore = avgSentenceLength < 100 ? 9 : avgSentenceLength < 150 ? 7 : 5;

  const overall = (lengthScore + structureFinal + readabilityScore) / 3;

  return {
    length: lengthScore,
    structure: Math.min(structureFinal, 10),
    readability: readabilityScore,
    overall,
  };
}

function calculateOverallScore(response: ResponseMetrics): number {
  const qualityScores = calculateQualityScores(response.response);

  // Quality: 50%
  const qualityScore = qualityScores.overall * 5; // Convert to 0-50

  // Speed: 30% (faster is better, max 3s = perfect)
  const speedScore = Math.max(0, 30 - (response.speed / 100));

  // Cost: 20% (free = perfect, $0.10 = 0)
  const costScore = response.cost === 0 ? 20 : Math.max(0, 20 - (response.cost * 200));

  return qualityScore + speedScore + costScore;
}

function generateInsights(responses: any[], winner: any) {
  const insights: Array<{ icon: string; title: string; description: string }> = [];

  // Fastest model
  const fastest = responses.reduce((min, r) => r.speed < min.speed ? r : min);
  if (fastest.model !== winner.model) {
    insights.push({
      icon: '⚡',
      title: `${fastest.model} is ${((winner.speed / fastest.speed - 1) * 100).toFixed(0)}% faster`,
      description: 'Consider using for time-sensitive tasks where speed matters most.',
    });
  }

  // Free models
  const freeModels = responses.filter(r => r.cost === 0);
  if (freeModels.length > 0 && winner.cost > 0) {
    insights.push({
      icon: '💰',
      title: `${freeModels.map(m => m.model).join(', ')} ${freeModels.length === 1 ? 'is' : 'are'} free`,
      description: `You could save $${winner.cost.toFixed(4)} per request by using local models.`,
    });
  }

  // Length differences
  const lengths = responses.map(r => r.response.length);
  const maxLength = Math.max(...lengths);
  const minLength = Math.min(...lengths);
  if (maxLength / minLength > 1.5) {
    const verbose = responses.find(r => r.response.length === maxLength);
    const concise = responses.find(r => r.response.length === minLength);
    insights.push({
      icon: '📏',
      title: 'Significant length variation',
      description: `${verbose?.model} is ${((maxLength / minLength - 1) * 100).toFixed(0)}% more verbose than ${concise?.model}.`,
    });
  }

  // Quality leader
  const highestQuality = responses.reduce((max, r) => r.scores.overall > max.scores.overall ? r : max);
  if (highestQuality.model === winner.model) {
    insights.push({
      icon: '🏆',
      title: 'Best overall choice',
      description: `${winner.model} provides the best balance of quality, speed, and cost for this task.`,
    });
  }

  return insights;
}
