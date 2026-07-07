import { Decimal } from '../../../../../shared-kernel/src/finance/Decimal';
import { InventoryTransaction } from '../aggregates/InventoryTransaction';
import { InventoryItem } from '../aggregates/InventoryItem';
import { InventoryValuationLayer } from '../aggregates/InventoryValuationLayer';
import { InventoryValuationResult } from '../aggregates/InventoryValuationResult';
import { InventoryTransactionType } from '../aggregates/InventoryTransactionType';

export class InventoryValuationService {
  public calculateValuation(
    transaction: InventoryTransaction,
    item: InventoryItem,
    availableLayers: InventoryValuationLayer[],
    currentAverageCost?: Decimal
  ): InventoryValuationResult {

    if (transaction.type === InventoryTransactionType.RECEIPT) {
      // For receipt, the unit cost is passed in some external payload.
      // We assume it's provided, but for this service mock we can't easily grab it unless we pass it.
      // Let's assume the transaction or external call provides it.
      throw new Error('Receipt valuation logic placeholder');
    }

    if (item.valuationMethod === 'FIFO') {
      return this.calculateFIFO(transaction, availableLayers);
    } else if (item.valuationMethod === 'WEIGHTED_AVERAGE') {
      return this.calculateWeightedAverage(transaction, currentAverageCost || new Decimal('0', 2, 38));
    }

    throw new Error('Unsupported valuation method');
  }

  private calculateFIFO(transaction: InventoryTransaction, layers: InventoryValuationLayer[]): InventoryValuationResult {
    let quantityToValue = transaction.quantity;
    let totalCost = 0;
    const consumedLayers: InventoryValuationLayer[] = [];

    // Sort layers by createdAt ASC to ensure FIFO
    const sortedLayers = [...layers].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    for (const layer of sortedLayers) {
      if (quantityToValue <= 0) break;

      const consumedQty = Math.min(layer.remainingQuantity, quantityToValue);
      layer.remainingQuantity -= consumedQty;
      quantityToValue -= consumedQty;
      
      totalCost += consumedQty * parseFloat(layer.unitCost.value);
      consumedLayers.push(layer);
    }

    if (quantityToValue > 0) {
      throw new Error('Insufficient inventory layers to fulfill FIFO dispatch.');
    }

    return new InventoryValuationResult(
      transaction.transactionId,
      transaction.tenantId,
      'FIFO',
      transaction.quantity,
      new Decimal((totalCost / transaction.quantity).toString(), 2, 38), // Effective unit cost
      new Decimal(totalCost.toString(), 2, 38),
      consumedLayers
    );
  }

  private calculateWeightedAverage(transaction: InventoryTransaction, averageCost: Decimal): InventoryValuationResult {
    const totalCost = transaction.quantity * parseFloat(averageCost.value);
    
    return new InventoryValuationResult(
      transaction.transactionId,
      transaction.tenantId,
      'WEIGHTED_AVERAGE',
      transaction.quantity,
      averageCost,
      new Decimal(totalCost.toString(), 2, 38),
      [] // WA doesn't consume specific layers
    );
  }
}
