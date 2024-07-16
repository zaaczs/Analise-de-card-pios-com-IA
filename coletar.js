import fetch from "node-fetch";
import OpenAIApi from "openai";

// URL da API que retorna os dados JSON do cardápio
const API_URL = "adicione o url da página a ser analisada";

async function fetchMenuData(url) {
  try {
    const response = await fetch(url, {
      headers: {
        "Company-Id": "adicione o id da company",
        Company: "adicione o nome da company",
      },
    });

    const contentType = response.headers.get("content-type");

    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text();
      console.error("Resposta não é um JSON:", text);
      throw new Error("Resposta não é um JSON");
    }

    const data = await response.json();
    console.log("Dados do cardápio:", data);

    return data;
  } catch (error) {
    console.error("Erro ao buscar os dados do cardápio:", error);
    return null;
  }
}

async function extractMenuData() {
  try {
    const response = await fetchMenuData(API_URL);
    if (!response) {
      console.error("Não foi possível obter os dados do cardápio.");
      return null;
    }

    const categories = response || [];

    const formattedData = categories.map((category) => ({
      categoryName: category.name || "Nome da categoria não disponível",
      isPromotion:
        category.name?.toLowerCase().includes("promoção") ||
        category.name?.toLowerCase().includes("oferta") ||
        false,
      isBestSeller:
        category.name?.toLowerCase().includes("mais vendidos") || false,
      isFeatured:
        category.name?.toLowerCase().includes("destaques") ||
        category.name?.toLowerCase().includes("especial") ||
        false,
      items: (category.items || []).map((product) => ({
        productName: product.name || "Nome não disponível",
        productDescription: product.description || "Descrição não disponível",
        productImage: product.image_url || "Imagem não disponível",
        isPromotion: product.promotional_price_active || false,
        isFeatured: product.highlighted || false,
        isBestSeller:
          product.name?.toLowerCase().includes("mais vendidos") || false,
      })),
    }));

    return formattedData;
  } catch (error) {
    console.error("Erro ao formatar os dados do cardápio:", error);
    return null;
  }
}

async function analyzeMenu(prompt) {
  const openai = new OpenAIApi({
    apiKey: "chave-api",
  });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
      top_p: 0.1,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Erro ao analisar o cardápio:", error);
    return null;
  }
}

async function buildPromptAndAnalyzeMenu() {
  const menuData = await extractMenuData();

  if (menuData) {
    const menuText = menuData
      .map(
        (category) => `
Categoria: ${category.categoryName}
- Promoção: ${category.isPromotion}
- Destaques: ${category.isFeatured}
- Mais Vendidos: ${category.isBestSeller}
${category.items
  .map(
    (item) => `
  - ${item.productName} (${item.productDescription})
  - Imagem: ${item.productImage}
  - Promoção: ${item.isPromotion}
  - Destaque: ${item.isFeatured}
  - Mais Vendidos: ${item.isBestSeller}
  `
  )
  .join("\n")}
      `
      )
      .join("\n\n");

    const prompt = `Analise o cardápio enviado com base nos seguintes critérios. Para cada critério, forneça exemplos específicos e sugestões de melhorias detalhadas:
1. O cardápio possui fotos nos produtos das duas primeiras categorias? Verifique a existência de URLs de imagens nos produtos.
2. O cardápio possui produtos com o preço promocional? Procure por produtos com preço promocional para identificar promoções.
3. O cardápio possui produtos em destaque? Procure por produtos com a opção "em destaque" ativa.
4. O cardápio possui descrições na maioria dos produtos? Procure por descrições que ficam dentro de cada produto. E dê sugestões de como melhorar as descrições
5. O cardápio possui categorias de produtos mais vendidos? Procure por categorias como "mais vendidos" e diga como posso organizar esta categoria de produtos mais vendidos
6. Caso passe de 10 categorias e 10 produtos em cada categoria, o cardápio é extenso e precisa ser encurtado.

Cardápio:
${menuText}

Dê uma nota de 0 a 10 com base nos critérios estabelecidos e forneça sugestões de melhorias. A saída esperada deve ser primeiro a nota de todo o cardápio, análise do cardápio e sugestões de melhorias no cardápio.`;

    const analysis = await analyzeMenu(prompt);
    console.log(analysis);
  } else {
    console.error("Não foi possível obter os dados do cardápio.");
  }
}

buildPromptAndAnalyzeMenu();
