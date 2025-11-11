/**
 * Prompt Service
 * Utility functions for prompt version control operations
 */

export class PromptService {
  /**
   * Extract variables from prompt content
   * Finds all {{variable_name}} patterns
   */
  static extractVariables(content: string): string[] {
    const regex = /\{\{([^}]+)\}\}/g;
    const variables = new Set<string>();
    let match;

    while ((match = regex.exec(content)) !== null) {
      variables.add(match[1].trim());
    }

    return Array.from(variables);
  }

  /**
   * Interpolate variables in prompt content
   * Replaces {{variable_name}} with actual values
   */
  static interpolateVariables(
    content: string,
    variables: Array<{ name: string; value: string }>
  ): string {
    let result = content;

    for (const { name, value } of variables) {
      const regex = new RegExp(`\\{\\{\\s*${name}\\s*\\}\\}`, 'g');
      result = result.replace(regex, value);
    }

    return result;
  }

  /**
   * Generate a simple line-by-line diff between two versions
   * Returns additions, deletions, and unchanged lines
   */
  static generateDiff(
    oldContent: string,
    newContent: string
  ): {
    additions: Array<{ line: number; content: string }>;
    deletions: Array<{ line: number; content: string }>;
    unchanged: Array<{ line: number; content: string }>;
  } {
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');

    const additions: Array<{ line: number; content: string }> = [];
    const deletions: Array<{ line: number; content: string }> = [];
    const unchanged: Array<{ line: number; content: string }> = [];

    // Simple line-by-line diff (this is a basic implementation)
    // For production, consider using a library like 'diff' or 'jsdiff'
    const maxLines = Math.max(oldLines.length, newLines.length);

    for (let i = 0; i < maxLines; i++) {
      const oldLine = oldLines[i];
      const newLine = newLines[i];

      if (oldLine === newLine) {
        if (oldLine !== undefined) {
          unchanged.push({ line: i + 1, content: oldLine });
        }
      } else {
        if (oldLine !== undefined && newLine === undefined) {
          deletions.push({ line: i + 1, content: oldLine });
        } else if (oldLine === undefined && newLine !== undefined) {
          additions.push({ line: i + 1, content: newLine });
        } else if (oldLine !== newLine) {
          // Line changed - treat as deletion + addition
          if (oldLine !== undefined) {
            deletions.push({ line: i + 1, content: oldLine });
          }
          if (newLine !== undefined) {
            additions.push({ line: i + 1, content: newLine });
          }
        }
      }
    }

    return { additions, deletions, unchanged };
  }

  /**
   * Validate prompt template name
   * Must be 1-200 characters, alphanumeric with spaces, hyphens, underscores
   */
  static validatePromptName(name: string): boolean {
    if (!name || name.length < 1 || name.length > 200) {
      return false;
    }
    // Allow alphanumeric, spaces, hyphens, underscores
    return /^[a-zA-Z0-9\s\-_]+$/.test(name);
  }

  /**
   * Validate collection name
   * Must be 1-100 characters, alphanumeric with spaces, hyphens, underscores
   */
  static validateCollectionName(name: string): boolean {
    if (!name || name.length < 1 || name.length > 100) {
      return false;
    }
    return /^[a-zA-Z0-9\s\-_]+$/.test(name);
  }

  /**
   * Generate a slug from a name (for unique identifiers)
   */
  static generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  }
}
