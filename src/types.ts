export type Category = 'racing' | 'screenshot';

export interface Screenshot {
  id: string;
  url: string;
  title: string;
  description: string;
  createdAt: number;
  category: Category;
}
