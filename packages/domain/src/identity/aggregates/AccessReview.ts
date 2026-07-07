import { AggregateRoot } from '../../../shared-kernel/src/domain/AggregateRoot';
import { TenantId } from '../../../shared-kernel/src/domain/value-objects/TenantId';
import { UserId } from '../value-objects/UserId';
import { Permission } from '../value-objects/Permission';

export enum AccessReviewStatus {
  Scheduled = 'SCHEDULED',
  InProgress = 'IN_PROGRESS',
  Completed = 'COMPLETED',
  Overdue = 'OVERDUE'
}

export interface ReviewItem {
  userId: UserId;
  targetPermission: Permission;
  approved: boolean;
  notes?: string;
}

export class AccessReview extends AggregateRoot<string> {
  private _tenantId: TenantId;
  private _reviewerId: UserId;
  private _status: AccessReviewStatus;
  private _items: ReviewItem[];
  private _dueDate: Date;

  private constructor(
    id: string,
    tenantId: TenantId,
    reviewerId: UserId,
    status: AccessReviewStatus,
    items: ReviewItem[],
    dueDate: Date
  ) {
    super(id);
    this._tenantId = tenantId;
    this._reviewerId = reviewerId;
    this._status = status;
    this._items = items;
    this._dueDate = dueDate;
  }

  public static create(
    id: string,
    tenantId: TenantId,
    reviewerId: UserId,
    dueDate: Date
  ): AccessReview {
    return new AccessReview(id, tenantId, reviewerId, AccessReviewStatus.Scheduled, [], dueDate);
  }

  public startReview(): void {
    if (this._status !== AccessReviewStatus.Scheduled) {
      throw new Error("Review is already in progress or completed.");
    }
    this._status = AccessReviewStatus.InProgress;
  }

  public completeReview(items: ReviewItem[]): void {
    this._items = items;
    this._status = AccessReviewStatus.Completed;
    // this.addDomainEvent(new AccessReviewCompletedEvent(this.id, this._tenantId));
  }

  get tenantId(): TenantId { return this._tenantId; }
  get reviewerId(): UserId { return this._reviewerId; }
  get status(): AccessReviewStatus { return this._status; }
  get items(): ReadonlyArray<ReviewItem> { return this._items; }
}
