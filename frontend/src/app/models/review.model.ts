export interface Review {
  id: string;
  reviewerId: string;
  targetId: string;
  targetType?: string;
  rating: number;
  comments?: string;
  createdAt: Date;
}

export interface CreateReviewCommand {
  reviewerId: string;
  targetId: string;
  targetType?: string;
  rating: number;
  comments?: string;
  createdAt: Date;
}
