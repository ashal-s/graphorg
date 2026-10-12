/** Where each kind of record lives, so related records can point to their page. */
export const contextPaths = {
  person: (slug: string) => `/${slug}`,
  team: (slug: string) => `/${slug}`,
  department: (id: string) => `/directory/departments/${id}`,
  service: (id: string) => `/catalog/services/${id}`,
  tool: (id: string) => `/catalog/tools/${id}`,
  document: (id: string) => `/documents/${id}`,
  folder: (id: string) => `/documents/folders/${id}`,
  workflow: (id: string) => `/workflows/${id}`,
} as const;
