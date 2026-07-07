import { Query } from '../../../shared/Query';
import { RequestContext } from '../../../shared/RequestContext';

export class GetInventoryDashboardQuery implements Query {
  constructor(
    public readonly context: RequestContext
  ) {}
}
