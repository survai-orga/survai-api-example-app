import fs from 'fs/promises';
import path from 'path';
import { createObjectCsvWriter } from 'csv-writer';
import { CONFIG } from '../config.js';
import type { EvaluatedAnswer, CodeFrameNode } from '../api/client.js';
import type { ReportData, ExportMetadata, ReportStatistics } from '../types.js';
import { countTotalCodes } from './code-frame.js';

interface CsvRow {
	customer_id: string;
	answer_id: string;
	answer_text: string;
	coding_number: number;
	code_path: string;
	textbits: string;
	tier: number | string;
}

export async function exportToCSV(
	evaluatedAnswers: EvaluatedAnswer[],
	metadata?: ExportMetadata
): Promise<string> {
	const exportDir = path.join(CONFIG.storage.dataDir, 'export');
	await fs.mkdir(exportDir, { recursive: true });

	const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
	const filename = `evaluation_results_${timestamp}.csv`;
	const filepath = path.join(exportDir, filename);

	const rows: CsvRow[] = [];

	for (const answer of evaluatedAnswers) {
		const baseRow = {
			customer_id: '',
			answer_id: answer.answerId || answer.id || '',
			answer_text: answer.answer_text || ''
		};

		if (answer.codings && answer.codings.length > 0) {
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
			rows.push({
				...baseRow,
				coding_number: 0,
				code_path: 'NO_CODING',
				textbits: '',
				tier: ''
			});
		}
	}

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

	await csvWriter.writeRecords(rows);
	return filepath;
}

export async function generateReport(data: ReportData): Promise<string> {
	const { survey, question, evaluation, codeFrame, evaluatedAnswers } = data;

	const exportDir = path.join(CONFIG.storage.dataDir, 'export');
	await fs.mkdir(exportDir, { recursive: true });

	const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
	const filename = `evaluation_report_${timestamp}.json`;
	const filepath = path.join(exportDir, filename);

	const stats = calculateStatistics(evaluatedAnswers, codeFrame);

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
			withCodings: evaluatedAnswers.filter((a) => a.codings && a.codings.length > 0).length,
			withoutCodings: evaluatedAnswers.filter((a) => !a.codings || a.codings.length === 0).length,
			samples: evaluatedAnswers.slice(0, 10).map((a) => ({
				answerId: a.id || a.answerId,
				answerText: a.answer_text,
				codings: a.codings || []
			}))
		}
	};

	await fs.writeFile(filepath, JSON.stringify(report, null, 2), 'utf-8');
	return filepath;
}

function calculateStatistics(
	evaluatedAnswers: EvaluatedAnswer[],
	_codeFrame: CodeFrameNode[]
): ReportStatistics {
	const totalAnswers = evaluatedAnswers.length;
	const answersWithCodings = evaluatedAnswers.filter((a) => a.codings && a.codings.length > 0);
	const totalCodings = evaluatedAnswers.reduce((sum, a) => sum + (a.codings?.length || 0), 0);

	const codeCounts: Record<string, number> = {};
	const tierCounts: Record<number, number> = {};

	for (const answer of evaluatedAnswers) {
		if (!answer.codings) continue;
		for (const coding of answer.codings) {
			codeCounts[coding.code_path] = (codeCounts[coding.code_path] || 0) + 1;
			if (coding.tier !== undefined) {
				tierCounts[coding.tier] = (tierCounts[coding.tier] || 0) + 1;
			}
		}
	}

	const topCodes = Object.entries(codeCounts)
		.map(([codePath, count]) => ({
			codePath,
			count,
			percentage: Math.round((count / totalAnswers) * 100)
		}))
		.sort((a, b) => b.count - a.count)
		.slice(0, 20);

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

function countTiers(codeFrame: CodeFrameNode[]): number {
	if (!codeFrame || codeFrame.length === 0) return 0;

	let maxTier = 0;

	function traverse(nodes: CodeFrameNode[], currentTier: number) {
		for (const node of nodes) {
			maxTier = Math.max(maxTier, currentTier);
			if (node.children && node.children.length > 0) {
				traverse(node.children, currentTier + 1);
			}
		}
	}

	traverse(codeFrame, 0);
	return maxTier + 1;
}
