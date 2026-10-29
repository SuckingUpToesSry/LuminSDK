# Como contribuir

Valeu pelo interesse em ajudar o **LuminSDK**! Este projeto é pequeno de propósito: HTML, CSS e
JavaScript puro, sem build e sem dependências. Contribuições de todos os tamanhos são bem-vindas:
correção de bug, texto, acessibilidade, performance ou uma ideia nova de interface.

## Antes de começar

- Leia o [README](README.md) para entender a estrutura.
- Verifique se já existe uma [issue](https://github.com/SuckingUpToesSry/LuminSDK/issues) sobre o
  assunto. Se não existir, abra uma descrevendo o problema ou a proposta.
- Para mudanças grandes (novas seções, mudança de layout), converse na issue antes de codar.

## Fluxo de trabalho

```bash
# 1. fork no GitHub e depois:
git clone https://github.com/<seu-usuario>/LuminSDK.git
cd LuminSDK

# 2. crie uma branch descritiva
git checkout -b feat/minha-melhoria

# 3. rode localmente
python3 -m http.server 8080

# 4. faça suas mudanças, teste e envie
git commit -m "feat: descreve a mudança"
git push origin feat/minha-melhoria
```

Abra um **pull request** para `main` explicando o que mudou e por quê. Prints ou um GIF ajudam
bastante em mudanças visuais.

## Padrões do projeto

- **Sem dependências e sem build.** Nada de npm, bundler ou frameworks.
- **Textos da interface em português (pt-BR).**
- **CSS organizado por seções**, com os tokens no topo de `assets/css/styles.css`.
- **JavaScript em `assets/js/`**, em módulos IIFE com `'use strict'`.
- **Acessibilidade sempre**: foco visível, `aria-label` em botões de ícone, contraste adequado e
  navegação por teclado.
- **Performance**: imagens carregadas sob demanda e nenhuma requisição desnecessária.
- Prefira melhorar o que já existe em vez de adicionar complexidade.

## Checklist antes de abrir o PR

- [ ] A página abre sem erros no console.
- [ ] Busca, categorias, paginação, aleatório e player continuam funcionando.
- [ ] O layout foi conferido no desktop e no celular.
- [ ] Tema claro e escuro continuam legíveis.
- [ ] Nenhuma dependência nova foi adicionada.

## Licença das contribuições

Ao enviar um pull request, você concorda que sua contribuição será publicada sob a
[licença MIT](LICENSE) deste projeto.
