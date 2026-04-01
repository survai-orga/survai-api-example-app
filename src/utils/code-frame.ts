import type { CodeFrameNode } from '../api/client.js';

export function countTotalCodes(codeFrame: CodeFrameNode[]): number {
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

export function displayCodeFrame(codeFrame: CodeFrameNode[], indent: string = ''): void {
	if (!codeFrame || codeFrame.length === 0) return;

	for (const node of codeFrame) {
		console.log(`${indent}${node.id}. ${node.name}`);
		if (node.children && node.children.length > 0) {
			displayCodeFrame(node.children, indent + '   ');
		}
	}
}
