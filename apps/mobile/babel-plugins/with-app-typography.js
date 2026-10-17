const nodePath = require('node:path');

/**
 * Route tous les Text et TextInput React Native vers les primitives globales
 * sans imposer 39 modifications d'import fragiles dans les écrans.
 */
module.exports = function withAppTypography({ types: t }) {
  return {
    name: 'with-app-typography',
    visitor: {
      Program(programPath, state) {
        const filename = state.filename || '';
        if (!filename || filename.endsWith(`${nodePath.sep}Typography.tsx`)) return;

        const replacements = [];
        for (const child of programPath.get('body')) {
          if (!child.isImportDeclaration() || child.node.source.value !== 'react-native') continue;
          child.node.specifiers = child.node.specifiers.filter((specifier) => {
            if (!t.isImportSpecifier(specifier) || !t.isIdentifier(specifier.imported)) return true;
            if (specifier.imported.name !== 'Text' && specifier.imported.name !== 'TextInput') return true;
            replacements.push({
              imported: specifier.imported.name === 'Text' ? 'AppText' : 'AppTextInput',
              local: specifier.local.name,
            });
            return false;
          });
          if (!child.node.specifiers.length) child.remove();
        }
        if (!replacements.length) return;

        const typographyFile = nodePath.join(__dirname, '..', 'src', 'components', 'Typography');
        let source = nodePath.relative(nodePath.dirname(filename), typographyFile).replaceAll(nodePath.sep, '/');
        if (!source.startsWith('.')) source = `./${source}`;
        programPath.unshiftContainer('body', t.importDeclaration(
          replacements.map(({ imported, local }) => t.importSpecifier(t.identifier(local), t.identifier(imported))),
          t.stringLiteral(source),
        ));
      },
    },
  };
};

