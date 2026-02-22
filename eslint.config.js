import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: [".continue/**", "mcp/**"] },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          "selector": "MemberExpression[object.name='process'][property.name='env']",
          "message": "[SSOT Error] Accessing process.env is forbidden outside of paths.js or config.ts. Import paths from paths.js instead."
        }
      ],
      "no-restricted-imports": [
        "error",
        {
          "paths": [
            {
              "name": "dotenv",
              "message": "[SSOT Error] Direct dotenv imports are banned. Use paths.js to manage env vars."
            }
          ]
        }
      ]
    }
  },
  {
    // Exceptions for files that legitimately manage environment bounds
    files: [
      "paths.js", 
      "scripts/**", 
      ".continue/config.ts", 
      "mcp/skills-mcp/server.js"
    ],
    rules: {
      "no-restricted-syntax": "off",
      "no-restricted-imports": "off"
    }
  }
];
