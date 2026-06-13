import type { SkillTreeAiResult } from '../ai/ai.service';

type ValidationNode = SkillTreeAiResult['nodes'][number];
type ValidationEdge = SkillTreeAiResult['edges'][number];

export class SkillTreeValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SkillTreeValidationError';
  }
}

export function validateAndNormalizeSkillTree(tree: SkillTreeAiResult): SkillTreeAiResult {
  const nodeIds = new Set<string>();
  for (const node of tree.nodes) {
    if (nodeIds.has(node.id)) {
      throw new SkillTreeValidationError(`Duplicate node id: ${node.id}`);
    }
    nodeIds.add(node.id);
  }

  const nodes = tree.nodes.map((node) => normalizeNode(node, nodeIds));
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  validateEdges(tree.edges, nodeIds);
  validateEdgePrerequisiteConsistency(nodes, tree.edges);
  validateAcyclic(nodes);
  validateLevelOrdering(nodes, nodeById);

  return {
    ...tree,
    nodes,
    edges: buildNormalizedEdges(nodes),
  };
}

function normalizeNode(node: ValidationNode, nodeIds: Set<string>): ValidationNode {
  const prerequisites = [...new Set(node.prerequisites)];
  for (const prerequisite of prerequisites) {
    if (!nodeIds.has(prerequisite)) {
      throw new SkillTreeValidationError(`Node ${node.id} references missing prerequisite: ${prerequisite}`);
    }
    if (prerequisite === node.id) {
      throw new SkillTreeValidationError(`Node ${node.id} cannot depend on itself`);
    }
  }

  return { ...node, prerequisites };
}

function validateEdges(edges: ValidationEdge[], nodeIds: Set<string>) {
  const edgeIds = new Set<string>();
  const edgePairs = new Set<string>();
  for (const edge of edges) {
    if (edgeIds.has(edge.id)) {
      throw new SkillTreeValidationError(`Duplicate edge id: ${edge.id}`);
    }
    edgeIds.add(edge.id);

    if (!nodeIds.has(edge.source)) {
      throw new SkillTreeValidationError(`Edge ${edge.id} references missing source: ${edge.source}`);
    }
    if (!nodeIds.has(edge.target)) {
      throw new SkillTreeValidationError(`Edge ${edge.id} references missing target: ${edge.target}`);
    }
    if (edge.source === edge.target) {
      throw new SkillTreeValidationError(`Edge ${edge.id} cannot point to itself`);
    }

    const pair = edgePair(edge.source, edge.target);
    if (edgePairs.has(pair)) {
      throw new SkillTreeValidationError(`Duplicate edge pair: ${pair}`);
    }
    edgePairs.add(pair);
  }
}

function validateEdgePrerequisiteConsistency(nodes: ValidationNode[], edges: ValidationEdge[]) {
  const expectedPairs = new Set(
    nodes.flatMap((node) => node.prerequisites.map((prerequisite) => edgePair(prerequisite, node.id))),
  );
  const actualPairs = new Set(edges.map((edge) => edgePair(edge.source, edge.target)));

  for (const pair of expectedPairs) {
    if (!actualPairs.has(pair)) {
      throw new SkillTreeValidationError(`Missing edge for prerequisite pair: ${pair}`);
    }
  }

  for (const pair of actualPairs) {
    if (!expectedPairs.has(pair)) {
      throw new SkillTreeValidationError(`Edge has no matching prerequisite pair: ${pair}`);
    }
  }
}

function validateAcyclic(nodes: ValidationNode[]) {
  const adjacency = new Map<string, string[]>();
  nodes.forEach((node) => adjacency.set(node.id, []));
  for (const node of nodes) {
    for (const prerequisite of node.prerequisites) {
      adjacency.get(prerequisite)?.push(node.id);
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (nodeId: string): boolean => {
    if (visiting.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;
    visiting.add(nodeId);
    for (const next of adjacency.get(nodeId) ?? []) {
      if (visit(next)) return true;
    }
    visiting.delete(nodeId);
    visited.add(nodeId);
    return false;
  };

  if (nodes.some((node) => visit(node.id))) {
    throw new SkillTreeValidationError('Skill tree contains a cycle');
  }
}

function validateLevelOrdering(nodes: ValidationNode[], nodeById: Map<string, ValidationNode>) {
  for (const node of nodes) {
    for (const prerequisite of node.prerequisites) {
      const prerequisiteNode = nodeById.get(prerequisite);
      if (!prerequisiteNode) continue;
      if (prerequisiteNode.level >= node.level) {
        throw new SkillTreeValidationError(
          `Invalid level order: ${prerequisiteNode.id} (level ${prerequisiteNode.level}) -> ${node.id} (level ${node.level})`,
        );
      }
    }
  }
}

function buildNormalizedEdges(nodes: ValidationNode[]): ValidationEdge[] {
  return nodes.flatMap((node) =>
    node.prerequisites.map((prerequisite, index) => ({
      id: `edge_${node.id}_${index + 1}`,
      source: prerequisite,
      target: node.id,
    })),
  );
}

function edgePair(source: string, target: string) {
  return `${source}->${target}`;
}
