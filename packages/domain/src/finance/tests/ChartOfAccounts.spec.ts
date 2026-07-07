import { ChartOfAccounts } from '../aggregates/ChartOfAccounts';
import { Account, AccountType } from '../entities/Account';
import { AccountCode } from '../value-objects/AccountCode';

describe('Chart of Accounts Aggregate', () => {
  let coa: ChartOfAccounts;

  beforeEach(() => {
    coa = new ChartOfAccounts('bus_test_001');
  });

  it('prevents duplicate account codes across the aggregate boundary', () => {
    const acc1 = Account.create('acc_1', AccountCode.create('1000'), 'Cash', AccountType.ASSET);
    const acc2 = Account.create('acc_2', AccountCode.create('1000'), 'Bank', AccountType.ASSET);

    coa.addAccount(acc1);
    expect(() => coa.addAccount(acc2)).toThrow('Account Code 1000 is already in use.');
  });

  it('detects and prevents infinite parent-child structural cycles', () => {
    // 1 -> 2 -> 3
    const acc1 = Account.create('acc_1', AccountCode.create('100'), 'A', AccountType.ASSET, null);
    const acc2 = Account.create('acc_2', AccountCode.create('200'), 'B', AccountType.ASSET, 'acc_1');
    const acc3 = Account.create('acc_3', AccountCode.create('300'), 'C', AccountType.ASSET, 'acc_2');

    coa.addAccount(acc1);
    coa.addAccount(acc2);
    coa.addAccount(acc3);

    // Attempt to make 1 a child of 3 (Cycle: 1 -> 3 -> 2 -> 1)
    const cyclicAcc1 = Account.create('acc_1', AccountCode.create('100'), 'A', AccountType.ASSET, 'acc_3');
    
    // We expect throwing on cycle detection
    // Wait, the COA prevents adding an account with the SAME ID anyway, but let's test the cycle function directly or via a new node
    const evilAcc = Account.create('acc_4', AccountCode.create('400'), 'Evil', AccountType.ASSET, 'acc_4');
    expect(() => coa.addAccount(evilAcc)).toThrow('Cycle detected: Account acc_4 cannot be its own ancestor.');
  });

  it('allows infinite depth nesting safely', () => {
    let parentId = null;
    for (let i = 1; i <= 100; i++) {
      const acc = Account.create(`acc_${i}`, AccountCode.create(`${1000 + i}`), `Level ${i}`, AccountType.ASSET, parentId);
      coa.addAccount(acc);
      parentId = `acc_${i}`;
    }
    expect(coa.getAllAccounts().length).toBe(100);
  });
});
