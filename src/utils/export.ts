import fs from 'fs/promises';
import path from 'path';
import { createObjectCsvWriter } from 'csv-writer';
import { CONFIG } from '../config.js';

/**
 * Export evaluated answers to CSV file
 */
export async function exportToCSV(
  evaluatedAnswers: any[],
  metadata?: { surveyName?: string; questionText?: string }
): Promise<string> {
  // Ensure export directory exists
  const exportDir = path.join(CONFIG.storage.dataDir, 'export');
  await fs.mkdir(exportDir, { recursive: true });

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const filename = `evaluation_results_${timestamp}.csv`;
  const filepath = path.join(exportDir, filename);

  // Prepare rows - flatten multi-coded answers
  const rows: any[] = [];

  for (const answer of evaluatedAnswers) {
    const baseRow = {
      customer_id: answer.customer_id || '',
      answer_id: answer.answerId || answer.id || '',
      answer_text: answer.answer_text || ''
    };

    if (answer.codings && answer.codings.length > 0) {
      // One row per coding
      for (let i = 0; i < answer.codings.length; i++) {
        const coding = answer.codings[i];
        rows.push({
          ...baseRow,
          coding_number: i + 1,
          code_path: coding.code_path || '',
          textbits: (coding.textbits || []).join(' | '),
          tier: coding.tier !== undefined ? coding.tier : ''
        });
      }
    } else {
      // No codings - still include the answer
      rows.push({
        ...baseRow,
        coding_number: 0,
        code_path: 'NO_CODING',
        textbits: '',
        tier: ''
      });
    }
  }

  // Create CSV writer
  const csvWriter = createObjectCsvWriter({
    path: filepath,
    header: [
      { id: 'customer_id', title: 'Customer ID' },
      { id: 'answer_id', title: 'Answer ID' },
      { id: 'answer_text', title: 'Answer Text' },
      { id: 'coding_number', title: 'Coding #' },
      { id: 'code_path', title: 'Code Path' },
      { id: 'textbits', title: 'Text Evidence' },
      { id: 'tier', title: 'Tier' }
    ]
  });

  // Write metadata as comments (CSV doesn't support comments, so we'll create a separate metadata file)
  if (metadata) {
    const metadataPath = filepath.replace('.csv', '_metadata.txt');
    const metadataContent = [
      'Evaluation Results Metadata',
      '='.repeat(50),
      `Survey: ${metadata.surveyName || 'N/A'}`,
      `Question: ${metadata.questionText || 'N/A'}`,
      `Exported: ${new Date().toISOString()}`,
      `Total Answers: ${evaluatedAnswers.length}`,
      `Total Rows: ${rows.length}`,
      ''
    ].join('\n');

    await fs.writeFile(metadataPath, metadataContent, 'utf-8');
  }

  // Write CSV
  await csvWriter.writeRecords(rows);

  return filepath;
}

/**
 * Generate comprehensive JSON report
 */
export async function generateReport(data: {
  survey: any;
  question: any;
  evaluation: any;
  codeFrame: any[];
  evaluatedAnswers: any[];
}): Promise<string> {
  const { survey, question, evaluation, codeFrame, evaluatedAnswers } = data;

  // Ensure export directory exists
  const exportDir = path.join(CONFIG.storage.dataDir, 'export');
  await fs.mkdir(exportDir, { recursive: true });

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const filename = `evaluation_report_${timestamp}.json`;
  const filepath = path.join(exportDir, filename);

  // Calculate statistics
  const stats = calculateStatistics(evaluatedAnswers, codeFrame);

  // Build report
  const report = {
    metadata: {
      generatedAt: new Date().toISOString(),
      surveyId: survey.id,
      surveyName: survey.name,
      questionId: question.id,
      questionText: question.question_text,
      evaluationId: evaluation.id,
      evaluationName: evaluation.name || 'Unnamed Evaluation'
    },
    statistics: stats,
    codeFrame: {
      tierCount: countTiers(codeFrame),
      totalCodes: countTotalCodes(codeFrame),
      structure: codeFrame
    },
    evaluation: {
      id: evaluation.id,
      name: evaluation.name,
      totalAnswers: evaluation.totalAnswers,
      processedAnswers: evaluation.processedAnswers,
      isCompleted: evaluation.is_completed,
      startedAt: evaluation.started,
      completedAt: evaluation.completed
    },
    answers: {
      total: evaluatedAnswers.length,
      withCodings: evaluatedAnswers.filter(a => a.codings && a.codings.length > 0).length,
      withoutCodings: evaluatedAnswers.filter(a => !a.codings || a.codings.length === 0).length,
      samples: evaluatedAnswers.slice(0, 10).map(a => ({
        answerId: a.id || a.answerId,
        answerText: a.answer_text,
        codings: a.codings || []
      }))
    }
  };

  // Write report
  await fs.writeFile(filepath, JSON.stringify(report, null, 2), 'utf-8');

  return filepath;
}

/**
 * Calculate detailed statistics from evaluated answers
 */
function calculateStatistics(evaluatedAnswers: any[], _codeFrame: any[]): any {
  const totalAnswers = evaluatedAnswers.length;
  const answersWithCodings = evaluatedAnswers.filter(a => a.codings && a.codings.length > 0);
  const totalCodings = evaluatedAnswers.reduce((sum, a) => sum + (a.codings?.length || 0), 0);

  // Count codes by path
  const codeCounts: Record<string, number> = {};
  const tierCounts: Record<number, number> = {};

  for (const answer of evaluatedAnswers) {
    if (!answer.codings) continue;

    for (const coding of answer.codings) {
      // Count by path
      const path = coding.code_path;
      codeCounts[path] = (codeCounts[path] || 0) + 1;

      // Count by tier
      if (coding.tier !== undefined) {
        tierCounts[coding.tier] = (tierCounts[coding.tier] || 0) + 1;
      }
    }
  }

  // Sort codes by frequency
  const topCodes = Object.entries(codeCounts)
    .map(([path, count]) => ({
      codePath: path,
      count,
      percentage: Math.round((count / totalAnswers) * 100)
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20); // Top 20

  // Calculate multi-coding statistics
  const codingDistribution: Record<number, number> = {};
  for (const answer of evaluatedAnswers) {
    const codingCount = answer.codings?.length || 0;
    codingDistribution[codingCount] = (codingDistribution[codingCount] || 0) + 1;
  }

  return {
    overview: {
      totalAnswers,
      answersWithCodings: answersWithCodings.length,
      answersWithoutCodings: totalAnswers - answersWithCodings.length,
      totalCodings,
      avgCodingsPerAnswer: totalAnswers > 0 ? (totalCodings / totalAnswers).toFixed(2) : 0,
      codingRate: totalAnswers > 0 ? Math.round((answersWithCodings.length / totalAnswers) * 100) : 0
    },
    topCategories: topCodes,
    tierDistribution: Object.entries(tierCounts).map(([tier, count]) => ({
      tier: parseInt(tier),
      count,
      percentage: Math.round((count / totalCodings) * 100)
    })),
    codingDistribution: Object.entries(codingDistribution)
      .map(([count, answers]) => ({
        codingsPerAnswer: parseInt(count),
        answerCount: answers,
        percentage: Math.round((answers / totalAnswers) * 100)
      }))
      .sort((a, b) => a.codingsPerAnswer - b.codingsPerAnswer)
  };
}

/**
 * Count total codes in hierarchical structure
 */
function countTotalCodes(codeFrame: any[]): number {
  if (!codeFrame) return 0;

  let count = 0;
  for (const node of codeFrame) {
    count++;
    if (node.children && node.children.length > 0) {
      count += countTotalCodes(node.children);
    }
  }
  return count;
}

/**
 * Count number of tiers in code frame
 */
function countTiers(codeFrame: any[]): number {
  if (!codeFrame || codeFrame.length === 0) return 0;

  let maxTier = 0;

  function traverse(nodes: any[], currentTier: number) {
    for (const node of nodes) {
      maxTier = Math.max(maxTier, currentTier);
      if (node.children && node.children.length > 0) {
        traverse(node.children, currentTier + 1);
      }
    }
  }

  traverse(codeFrame, 0);
  return maxTier + 1; // +1 because tiers are 0-indexed
}
