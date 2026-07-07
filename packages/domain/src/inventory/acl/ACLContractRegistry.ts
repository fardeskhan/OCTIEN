export interface ACLContract {
  contractName: string;
  contractVersion: string;
}

export interface ACLContractRegistry {
  registerInbound(contract: ACLContract, translator: (externalEvent: any) => any): void;
  registerOutbound(contract: ACLContract, translator: (internalEvent: any) => any): void;

  translateInbound(contract: ACLContract, externalEvent: any): any;
  translateOutbound(contract: ACLContract, internalEvent: any): any;
}

export class DefaultACLContractRegistry implements ACLContractRegistry {
  private inboundRegistry = new Map<string, (externalEvent: any) => any>();
  private outboundRegistry = new Map<string, (internalEvent: any) => any>();

  private getContractKey(contract: ACLContract): string {
    return `${contract.contractName}_v${contract.contractVersion}`;
  }

  public registerInbound(contract: ACLContract, translator: (externalEvent: any) => any): void {
    this.inboundRegistry.set(this.getContractKey(contract), translator);
  }

  public registerOutbound(contract: ACLContract, translator: (internalEvent: any) => any): void {
    this.outboundRegistry.set(this.getContractKey(contract), translator);
  }

  public translateInbound(contract: ACLContract, externalEvent: any): any {
    const translator = this.inboundRegistry.get(this.getContractKey(contract));
    if (!translator) {
      throw new Error(`Inbound contract translator not found for ${this.getContractKey(contract)}`);
    }
    const result = translator(externalEvent);
    this.assertCorrelationIntegrity(externalEvent, result);
    return result;
  }

  public translateOutbound(contract: ACLContract, internalEvent: any): any {
    const translator = this.outboundRegistry.get(this.getContractKey(contract));
    if (!translator) {
      throw new Error(`Outbound contract translator not found for ${this.getContractKey(contract)}`);
    }
    const result = translator(internalEvent);
    this.assertCorrelationIntegrity(internalEvent, result);
    return result;
  }

  // CERT-ACL-003 Rule Enforcement
  private assertCorrelationIntegrity(source: any, result: any): void {
    if (source.tenantId !== result.tenantId) throw new Error("Correlation Integrity Failed: tenantId mismatch");
    if (source.correlationId !== result.correlationId) throw new Error("Correlation Integrity Failed: correlationId mismatch");
    if (source.causationId !== result.causationId) throw new Error("Correlation Integrity Failed: causationId mismatch");
  }
}
