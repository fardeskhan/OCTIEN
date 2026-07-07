export class DependencyGraphService {
  
  public topologicalSort(formulas: { target: string, dependencies: string[] }[]): string[] {
    const adj = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    for (const f of formulas) {
      if (!adj.has(f.target)) adj.set(f.target, []);
      if (!inDegree.has(f.target)) inDegree.set(f.target, 0);

      for (const dep of f.dependencies) {
        if (!adj.has(dep)) adj.set(dep, []);
        if (!inDegree.has(dep)) inDegree.set(dep, 0);

        adj.get(dep)!.push(f.target);
        inDegree.set(f.target, inDegree.get(f.target)! + 1);
      }
    }

    const queue: string[] = [];
    for (const [node, degree] of inDegree.entries()) {
      if (degree === 0) queue.push(node);
    }

    const order: string[] = [];
    while (queue.length > 0) {
      const node = queue.shift()!;
      order.push(node);

      for (const neighbor of adj.get(node) || []) {
        inDegree.set(neighbor, inDegree.get(neighbor)! - 1);
        if (inDegree.get(neighbor) === 0) queue.push(neighbor);
      }
    }

    if (order.length !== inDegree.size) {
      throw new Error('Circular dependency detected in formulas');
    }

    return order;
  }
}
