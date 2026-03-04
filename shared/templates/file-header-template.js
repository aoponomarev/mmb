/**
 * #JS-XXXXXXXX
 * [MODULE NAME - One-line human-readable description]
 * @description One-sentence summary for tooling and agents. Required.
 * @skill id:sk-xxxxx
 * @skill-anchor id:sk-xxxxx #for-xxx
 * @causality #for-xxx
 * @ssot <spec-or-policy-name>
 * @gate <validator-script-name>
 * @contract <contract-name>
 * @see id:sk-xxxxx
 *
 * PURPOSE: What this file does and why. One or two sentences.
 * PRINCIPLES | USAGE | REFERENCES: Optional free-form sections.
 */
// FILE HEADER TEMPLATE — Canonical structure for code file headers (SSOT: docs/ais/ais-file-header-standard.md).
// Copy the block above into any .js/.ts/.css file. Replace #JS-XXXXXXXX with actual file id (#<EXT>-<hash>).
// File id: hash from canonical relative path (see AIS). Order of slots is mandatory; omit optional slots if not needed.
// Plan: docs/plans/file-header-rollout.md. Contract: is/contracts/file-header-contract.js. Gate: validate-file-headers.js.

(function() {
    'use strict';
    if (typeof window !== 'undefined') {
        window.FILE_HEADER_TEMPLATE_REF = true;
    }
})();
