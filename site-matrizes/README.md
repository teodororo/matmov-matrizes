# Imagens são matrizes

Uma página interativa para ensinar matrizes no ensino médio por meio de imagens. Os alunos mexem nos números de uma imagem, veem o que acontece e, na última aba, fazem um computador ler o desenho deles. Tudo roda no navegador (computador ou celular), sem instalar nada e sem enviar dados para lugar nenhum.

O site inteiro é **um arquivo só, `index.html`** (texto, imagens desenhadas por código, programas e fontes estão dentro dele). Por isso, publicar no GitHub Pages leva alguns minutos.

## O que tem em cada aba

| Aba | O que os alunos fazem |
|---|---|
| **1. Pixels e transposta** | Editam os pixels de uma imagem em preto e branco e veem a matriz de 0 e 1 mudar, com botão para voltar à imagem original. Veem a transposta ao lado e respondem: *qual das representações corresponde à transposta da imagem?* |
| **2. Cores e soma** | Veem uma imagem separada em três matrizes (R, G e B) que, somadas, formam a imagem colorida. Pintam ou digitam números nas matrizes. Depois exploram a soma de um número a todos os canais e respondem: *como aumentar a luminosidade?* |
| **3. Subtração e negativo** | Calculam o negativo como `N = J − A` em preto e branco, em tons de cinza e numa foto colorida. |
| **4. Filtros** | Veem como uma matriz 3 × 3 calcula cada pixel olhando para os vizinhos, inventam filtros (desafios), testam o mesmo filtro em várias imagens e aprendem receitas para criar outros. |
| **5. História e IA** | Pequena aula de história: Alan Turing, o nome “inteligência artificial”, o perceptron, a competição de leitura de dígitos dos anos 1990, o Deep Blue e o xadrez como matriz, LeNet, AlexNet, AlphaGo e os modelos de linguagem de hoje. Desenham dígitos para um mini-reconhecedor e mexem num tabuleiro de xadrez escrito em números. Fecha com a ideia de que **as IAs de hoje são, na verdade, matrizes**. |

Cada aba termina com perguntas de múltipla escolha (com explicação de cada erro) e com a caixa **Para conversar em sala**, com perguntas para discussão. Só a aba ativa fica visível, e dá para trocar de aba a qualquer momento.

## Como publicar no GitHub Pages

1. Crie uma conta em [github.com](https://github.com), se ainda não tiver.
2. Clique em **New repository** (botão verde, ou o **+** no canto superior direito). Escolha um nome (por exemplo `matrizes`), deixe **Public** e clique em **Create repository**.
3. Na página do repositório, clique em **uploading an existing file** (ou em *Add file → Upload files*). Arraste o arquivo **`index.html`** para a janela e clique em **Commit changes**. O arquivo precisa se chamar exatamente `index.html` e ficar na raiz do repositório, não dentro de uma pasta.
4. Vá em **Settings → Pages**. Em *Build and deployment → Source*, escolha **Deploy from a branch**. Em *Branch*, escolha `main` e a pasta `/ (root)`. Clique em **Save**.
5. Espere um ou dois minutos e atualize a página de configurações. O endereço do site aparece no topo, neste formato: `https://SEU-USUARIO.github.io/matrizes/`.

Para trocar por uma versão nova, envie o `index.html` de novo (*Add file → Upload files*, com o mesmo nome) e confirme. O site é atualizado em alguns minutos.

## Dicas para a sala de aula

- **Link direto para uma aba:** acrescente `#secao-1` até `#secao-5` ao endereço (por exemplo, `https://SEU-USUARIO.github.io/matrizes/#secao-3`).
- **Sem internet:** o `index.html` também abre direto do computador (duplo clique), então dá para usar em sala sem Wi-Fi. Só os links de “Para saber mais” precisam de internet.
- **Fotos dos alunos:** nas abas 2, 3 e 4 há o botão **Usar minha foto**. A foto é processada no próprio aparelho e não é enviada a lugar nenhum.
- **Celular e teclado:** a página se adapta a telas pequenas. Quase tudo também pode ser feito só com o teclado (Tab, setas, Enter e espaço); a exceção principal é desenhar o dígito na aba 5, que tem a alternativa de clicar nos exemplos.
- **Navegadores:** versões recentes de Chrome, Edge, Firefox e Safari (de 2021 em diante).

## Como mudar textos

Abra o `index.html` num editor de texto, procure o trecho (Ctrl+F) e edite. Os textos das abas estão em HTML simples. As perguntas dos quizzes e alguns rótulos ficam dentro dos blocos `<script>`, entre aspas. Depois, envie o arquivo de novo ao GitHub.

## Sobre o reconhecedor de dígitos (aba 5)

- É uma regressão logística (*softmax*): uma matriz **W** de 10 linhas × 64 colunas (um “molde” por dígito) e 10 números fixos. A conta é `notas = W · x + b`, em que **x** é a imagem 8 × 8 do dígito (números de 0 a 16).
- O desenho do aluno vira uma imagem de 32 × 32 pixels e depois uma matriz 8 × 8, do mesmo jeito que os dados de treino foram preparados (cada bloco de 4 × 4 pixels vira a contagem de pixels pintados).
- Treinado com 1.347 dígitos reais do conjunto da UCI e 4.000 desenhados por programa. Em 450 dígitos reais que ficaram de fora do treino, acerta **95,6%**. Em desenhos simulados por programa, cerca de 96%. Com o traço de verdade, no mouse ou no dedo, pode errar mais. Isso é parte da aula: o computador só conhece o que viu no treino.
- O tabuleiro de xadrez da aba 5 deixa mover as peças livremente e **não confere as regras do xadrez**: o objetivo é ver a matriz mudar.

## Código-fonte (opcional)

O `codigo-fonte.zip` que acompanha este arquivo traz o projeto organizado em arquivos separados, para quem quiser mexer mais a fundo (ou pedir a alguém para mexer):

```
src/                 textos (src/html), estilos (src/css) e programas (src/js)
tools/build.py       junta tudo em dist/index.html (precisa só de Python 3)
tools/fonts/         fontes embutidas, com as licenças (LICENSE-*.txt)
tools/*.py           geram as imagens de exemplo e treinam o reconhecedor (precisam de numpy, Pillow e scikit-learn)
tests/               testes da parte matemática (node tests/logic.test.js)
```

Para gerar o arquivo único a partir do código-fonte: `python3 tools/build.py`. O resultado fica em `dist/index.html`. Nada disso é necessário para publicar o site.

## Créditos e licenças

- **Dados dos dígitos:** *Optical Recognition of Handwritten Digits*, de E. Alpaydin e C. Kaynak, UCI Machine Learning Repository, licença CC BY 4.0. <https://archive.ics.uci.edu/dataset/80/optical+recognition+of+handwritten+digits>
- **Fontes:** Atkinson Hyperlegible Next (© 2020–2024 The Atkinson Hyperlegible Next Project Authors) e Atkinson Hyperlegible Mono (© 2020–2024 The Atkinson Hyperlegible Mono Project Authors), do Braille Institute, e Noto Sans Symbols 2, usada nas peças de xadrez (© 2022 The Noto Project Authors). Todas sob a licença SIL Open Font License 1.1, <https://openfontlicense.org>. Os avisos de copyright também estão no começo do `index.html`.
- A primeira aba foi inspirada na atividade de matrizes do projeto CDME, da UFF (<https://cdme.im-uff.mat.br>). Nenhum material dele foi copiado.

### Fontes dos fatos históricos (aba 5)

- Alan Turing, “Computing Machinery and Intelligence”, *Mind*, 1950: <https://doi.org/10.1093/mind/LIX.236.433>
- NIST, *The First Census Optical Character Recognition Systems Conference* (NISTIR 4912, 1992): <https://nvlpubs.nist.gov/nistpubs/Legacy/IR/nistir4912.pdf>
- IBM, *Deep Blue* (maio de 1997, 3½ a 2½, cerca de 200 milhões de posições por segundo): <https://www.ibm.com/history/deep-blue>
- LeNet (LeCun e colegas, 1998): <https://en.wikipedia.org/wiki/LeNet>
- AlexNet (Krizhevsky, Sutskever e Hinton; ImageNet 2012): <https://en.wikipedia.org/wiki/AlexNet>
- Vaswani e colegas, *Attention Is All You Need* (2017): <https://arxiv.org/abs/1706.03762>
