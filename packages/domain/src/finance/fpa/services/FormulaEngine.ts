import { Decimal } from '../../../../../shared-kernel/src/finance/Decimal';
import { ASTNode, ASTNodeType, FormulaParser } from './FormulaParser';

export class FormulaEngine {
  private parser = new FormulaParser();

  public evaluate(expression: string, context: Map<string, Decimal>): Decimal {
    const ast = this.parser.parse(expression);
    return this.evaluateNode(ast, context);
  }

  private evaluateNode(node: ASTNode, context: Map<string, Decimal>): Decimal {
    if (node.type === ASTNodeType.VARIABLE) {
      const varName = (node.value as string).replace(/\[|\]/g, ''); // strip brackets
      if (!context.has(varName)) {
        throw new Error(`Structural Resolution Error: Missing variable ${varName}`);
      }
      return context.get(varName)!;
    }

    if (node.type === ASTNodeType.LITERAL) {
      return new Decimal(node.value!.toString(), 2, 38);
    }

    const left = this.evaluateNode(node.left!, context);
    const right = this.evaluateNode(node.right!, context);

    const lVal = parseFloat(left.value);
    const rVal = parseFloat(right.value);

    switch (node.type) {
      case ASTNodeType.ADD:
        return new Decimal((lVal + rVal).toString(), 2, 38);
      case ASTNodeType.SUBTRACT:
        return new Decimal((lVal - rVal).toString(), 2, 38);
      case ASTNodeType.MULTIPLY:
        return new Decimal((lVal * rVal).toString(), 2, 38);
      case ASTNodeType.DIVIDE:
        if (rVal === 0) throw new Error('Division by zero');
        return new Decimal((lVal / rVal).toString(), 2, 38);
      default:
        throw new Error('Unsupported AST Node');
    }
  }
}
