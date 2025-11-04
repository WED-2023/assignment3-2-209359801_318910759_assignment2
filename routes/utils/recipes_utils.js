const axios = require("axios");
const DB_utils = require("./DButils");

require("dotenv").config();

const api_domain = "https://api.spoonacular.com/recipes";


/**
 * Get recipes list from spooncular response and extract the relevant recipe data for preview
 * @param {*} recipes_info 
 */

// A function for normlized a U_ID formated recipeID if needed - return it as a string-int for example '21255'
function normalizeId(id) {
  // try to cast id to int
  const num = Number(id);

  if (!isNaN(num)) {
    // return ID as string
    return id;
  }
  // cut U_ from U_ID
  return  id.substring(2);;
}


async function getRecipeInformation(recipe_id) {
    return await axios.get(`${api_domain}/${recipe_id}/information`, {
        params: {
            includeNutrition: false,
            apiKey: process.env.spooncular_apiKey
        }
    });
}

// Using spooncular API or local DB to extract recipe details
async function getRecipeDetails(recipe_id) {
  // Case 1: Local user-created recipe (starts with 'U_')
  recipe_id = String(recipe_id);
  if (recipe_id.startsWith("U_")) {
    const results = await DB_utils.execQuery(`
      SELECT recipeID, title, image, readyInMinutes, vegan, vegetarian, glutenFree, instructions, extendedIngredients, servings
      FROM recipes
      WHERE recipeID = '${recipe_id}'
    `);

    if (results.length === 0) {
      throw new Error(`Recipe ${recipe_id} not found in local DB`);
    }

    const recipe = results[0];
    const local_likes_result = await DB_utils.execQuery(`
      SELECT likes FROM recipes_local_likes WHERE recipeID = '${recipe.recipeID}'
    `);
    const local_likes = local_likes_result.length > 0 ? local_likes_result[0].likes : 0;

    return {
      id: recipe.recipeID,
      title: recipe.title,
      image: recipe.image,
      readyInMinutes: recipe.readyInMinutes,
      popularity: local_likes,
      vegan: recipe.vegan,
      vegetarian: recipe.vegetarian,
      glutenFree: recipe.glutenFree,
      extendedIngredients: parseIngredients(recipe.extendedIngredients),
      instructions: recipe.instructions,
      servings: recipe.servings,
    };
  }

  // ✅ Case 2: Family recipe (starts with 'F_')
  if (recipe_id.startsWith("F_")) {
    const results = await DB_utils.execQuery(`
      SELECT recipeID, userID, title, image, readyInMinutes, extendedIngredients
      FROM family_recipes
      WHERE recipeID = '${recipe_id}'
    `);

    if (results.length === 0) {
      throw new Error(`Family recipe ${recipe_id} not found`);
    }

    const recipe = results[0];

    return {
      id: recipe.recipeID,
      title: recipe.title,
      image: recipe.image,
      readyInMinutes: recipe.readyInMinutes,
      popularity: 0, 
      extendedIngredients: parseIngredients(recipe.extendedIngredients),
      instructions: "המתכון נשמר על ידי בני משפחה ואין לו הוראות פורמליות.",
      servings: 1,
      vegan: false,
      vegetarian: false,
      glutenFree: false
    };
  }

  // Case 3: External recipe from Spoonacular (numeric ID)
  let recipe_info = await getRecipeInformation(recipe_id);
  let {
    id,
    title,
    readyInMinutes,
    image,
    aggregateLikes,
    vegan,
    vegetarian,
    glutenFree,
    extendedIngredients,
    instructions,
    servings,
  } = recipe_info.data;

  const local_likes_result = await DB_utils.execQuery(`
    SELECT likes FROM recipes_local_likes WHERE recipeID = '${id}'
  `);
  const local_likes = local_likes_result.length > 0 ? local_likes_result[0].likes : 0;

  return {
    id,
    title,
    readyInMinutes,
    image,
    popularity: aggregateLikes + local_likes,
    vegan,
    vegetarian,
    glutenFree,
    extendedIngredients,
    instructions,
    servings,
  };
}

// ✅ Utility to safely parse ingredients
function parseIngredients(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {
    // fallback: split by comma if not valid JSON
  }
  return raw.split(',').map(str => str.trim());
}



// given an array of recipe full info - extract only the preview info
function extractPreviewRecipeDetails(recipes_info) {
  return recipes_info.map((recipe_info) => {
    //check the data type so it can work with diffrent types of data
    let data = recipe_info;
    if (recipe_info.data) {
      data = recipe_info.data;
    }
    const {
      id,
      title,
      readyInMinutes,
      image,
      popularity,
      vegan,
      vegetarian,
      glutenFree,
    } = data;
    return {
      id: id,
      title: title,
      image: image,
      readyInMinutes: readyInMinutes,
      popularity: popularity,
      vegan: vegan,
      vegetarian: vegetarian,
      glutenFree: glutenFree
    }
  })
}

// given an array of recipes ids -> retrive all recipe preciew 

async function getRecipesPreview(recipes_ids_list) {
  // Separate DB-based recipes (start with 'U')  
  const db_recipes = recipes_ids_list.filter(id => id[0] === 'U');

  // Query DB recipes
  let db_preview_recipe_records = [];
  if (db_recipes.length > 0) {
    db_preview_recipe_records = await DB_utils.execQuery(
      `SELECT recipeID, title, image, readyInMinutes, vegan, vegetarian, glutenFree 
       FROM recipes 
       WHERE recipeID IN (${db_recipes.map(id => `'${id}'`).join(',')})`
    );

    // Convert recipeID → id
    db_preview_recipe_records = db_preview_recipe_records.map(r => ({
      id: r.recipeID,
      title: r.title,
      image: r.image,
      readyInMinutes: r.readyInMinutes,
      vegan: r.vegan,
      vegetarian: r.vegetarian,
      glutenFree: r.glutenFree
    }));
  }

  // Query external API for non-DB recipes
  const filteredList = recipes_ids_list.filter(id => !db_recipes.includes(id));
  let info_res = [];
  if (filteredList.length > 0) {
    const promises = filteredList.map(id => getRecipeDetails(id));
    const apiResults = await Promise.all(promises);
    info_res = extractPreviewRecipeDetails(apiResults);
  }
  info_res.forEach(r => r.id = String(r.id));

  // Combine results
const combined = info_res.concat(db_preview_recipe_records);
// order results based on origin order
const ordered = recipes_ids_list.map(id => combined.find(r => r.id === String(id)));

return ordered;

}


// return 3 random recipes from spooncular API
async function get3RandomPreviwe() {
  const validRecipes = [];

  while (validRecipes.length < 3) {
    try {
      const response = await axios.get(`${api_domain}/random?number=1`, {
        params: {
          includeNutrition: false,
          apiKey: process.env.spooncular_apiKey,
        }
      });

      const recipe = response.data.recipes[0];
      const validation = await IsValidRecipe(recipe.image, recipe.instructions);

      if (validation){
        validRecipes.push(recipe);
      }

    } catch (error) {
      console.error("🔁 Error (from spooncularAPI) fetching recipe:", error.message);
      break;
    }
  }

  return extractPreviewRecipeDetails(validRecipes);
}

async function IsValidRecipe(recipeURL, recipeInstructions){
    // test img url
    const isBroken = await isImageBroken(recipeURL); 
    // text instructions
    const hasInstructions = recipeInstructions && recipeInstructions.trim() !== "";
    return !isBroken && hasInstructions;
}

const fetch = require("node-fetch"); // for demonstare a promper fetching of url as

async function isImageBroken(url) {
  if (
    typeof url !== 'string' ||
    url.trim().length === 0 ||
    !/\.(jpg|jpeg|png|webp)$/i.test(url)
  ) {
    return true;
  }

  try {
    const res = await fetch(url, { method: 'HEAD' }); // try to fetch url as img
    return !res.ok; 
  } catch (err) {
    return true; // while error occured -> just return that this is a broken img
  }
}

async function searchRecipes(recipe_title, extended_search = {}) {
  const {
    cuisine,
    diet,
    intolerance,
    limit = 5,
    sort
  } = extended_search;

  const params = {
    query: recipe_title,
    number: limit,
    instructionsRequired: true,
    includeNutrition: false,
    apiKey: process.env.spooncular_apiKey
  };

  if (cuisine) params.cuisine = cuisine;
  if (diet) params.diet = diet;
  if (intolerance && Array.isArray(intolerance) && intolerance.length != 0) {
    params.intolerances = intolerance.join(",");
  }
  if (sort) params.sort = sort;
  const results_from_api = await axios.get(`${api_domain}/complexSearch`, {
        params: params
    });

  const filteredResults = [];
  for (const recipe of results_from_api.data.results){
    try {
      const recipe_detailed = (await getRecipeInformation(recipe.id)).data;
      const isValid = await IsValidRecipe(recipe_detailed.image, recipe_detailed.instructions);
      if (isValid) filteredResults.push(recipe_detailed.id);
    } catch (err) {
      console.log(`Failed to get details for recipe ${recipe.id}:`, err.message);
    }
  }
  console.log(`returning: ${filteredResults}`);
  return filteredResults;
}

async function increaseRecipeLikes(recipeID) {
   const records = await DB_utils.execQuery(`SELECT likes FROM recipes_local_likes WHERE recipeID = '${recipeID}';`);

  // update likes
    if (records.length > 0) 
      await DB_utils.execQuery(`UPDATE recipes_local_likes SET likes = likes + 1 WHERE recipeID = '${recipeID}';`);
    else 
      await DB_utils.execQuery(`INSERT INTO recipes_local_likes (recipeID, likes) VALUES ('${recipeID}', 1);`);

    return { success: true };
    }

exports.normalizeId = normalizeId;
exports.getRecipeDetails = getRecipeDetails;
exports.getRecipesPreview = getRecipesPreview;
exports.get3RandomPreviwe = get3RandomPreviwe;
exports.searchRecipes = searchRecipes;
exports.increaseRecipeLikes = increaseRecipeLikes;
