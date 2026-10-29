export const CONTENT_TYPES = ['Movie', 'Series', 'Episode', 'Live Channel'] as const;
export const CONTENT_STATUSES = ['Published', 'Draft', 'Archived'] as const;
export const LANGUAGES = ['English', 'Hindi', 'Telugu', 'Tamil', 'Malayalam', 'Kannada', 'Bengali', 'Marathi'] as const;
export const GENRES = ['Drama', 'Action', 'Comedy', 'Thriller', 'Documentary', 'Kids', 'Romance', 'News', 'Sports', 'Devotional'] as const;
export const AGE_RATINGS = ['U', 'U/A 7+', 'U/A 13+', 'U/A 16+', 'A'] as const;

export type ContentType = (typeof CONTENT_TYPES)[number];
export type ContentStatus = (typeof CONTENT_STATUSES)[number];
export type Language = (typeof LANGUAGES)[number];
export type AgeRating = (typeof AGE_RATINGS)[number];

/** Localized title shown to viewers of a given audio/subtitle language. */
export interface Translation {
  language: Language;
  title: string;
}

export interface Content {
  id: number;
  title: string;
  type: ContentType;
  genre: string;
  primaryLanguage: Language;
  translations: Translation[];
  status: ContentStatus;
  ageRating: AgeRating;
  releaseDate: string;
  /** Runtime in minutes. Not applicable to live channels. */
  durationMinutes: number | null;
  thumbnailUrl: string;
  description: string;
  tags: string[];
  updatedAt: string;
}

export type ContentPayload = Omit<Content, 'id' | 'updatedAt'>;

export type SortField = 'title' | 'type' | 'status' | 'releaseDate' | 'updatedAt';

export interface ContentQuery {
  q: string;
  type: ContentType | '';
  status: ContentStatus | '';
  language: Language | '';
  sort: SortField;
  order: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

export interface Page<T> {
  items: T[];
  total: number;
}

export interface DashboardStats {
  total: number;
  byStatus: Record<ContentStatus, number>;
  byType: Record<ContentType, number>;
  byLanguage: { language: Language; count: number }[];
  recentlyUpdated: Content[];
}

export const DEFAULT_QUERY: ContentQuery = {
  q: '',
  type: '',
  status: '',
  language: '',
  sort: 'updatedAt',
  order: 'desc',
  page: 1,
  pageSize: 10,
};
