# @faigle/node-red-contrib-_template_

This repository is a GitHub template for creating custom Node-RED nodes. It includes a boilerplate node (`_template_`), a testing setup using Mocha, and automated code quality tools.

## Creating Real Nodes

To build a functional node from this template, replace the placeholder data:

1. **Create a new repository:** _Use this template_ on GitHub to create a new repository.
2. **Clone repository:** Clone the repository locally
3. **Rename Files:** Change `_template_.js`, `_template_.html`, and `test/_template_spec.js` to match your node's intended name.
4. **Update `package.json`:** Modify the `"name"`, `"description"`, and map your new file in the `"node-red": { "nodes": { ... } }` object.
5. **Update Source Code:** Search and replace all instances of `_template_` and `ExampleTemplateNode` in the `.js`, `.html`, and `_spec.js` files with your actual node type and function names.
6. **Change Versioon:** change the version in `package.json`

## Development Tools

### Linter (ESLint)

The project uses ESLint v10 with a flat configuration (`eslint.config.mjs`). Plugins are included to lint JavaScript, HTML, JSON, and Markdown files.

- Run the linter: \
  `npm run lint`

### Formatter (Prettier)

Prettier is configured to enforce consistent styling across JavaScript, HTML, and Markdown files.

- Run the formatter: `npm run format`

#### Markdown Block Exception **(`<!-- prettier-ignore -->`)**

In the `_template_.html` file, you will find an HTML comment `<!-- prettier-ignore -->` immediately preceding the `<script type="text/markdown" data-help-name="_template_">` block. Node-RED requires strict formatting to correctly render this Markdown in the editor's help sidebar. Prettier would otherwise reformat the text (e.g., altering indentation or line breaks) and break Node-RED's internal parser.

### Git Hooks (Husky)

Husky manages Git hooks to enforce code quality before commits. The included `pre-commit` script automatically performs the following actions:

1. Runs the test suite (`npm test`).
2. Triggers `lint-staged` to format and lint the files you are attempting to commit.
3. Automatically increments the patch version in your package (`npm version patch --no-git-tag-version`).
4. Stages the updated `package.json` and `package-lock.json` files to be included in the commit.
