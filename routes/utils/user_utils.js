const DB_utils = require("./DButils");

// Favorite:

async function markAsFavorite(user_id, recipe_id){
  // recipe_id can be U_ID or just ID from spooncular
    const isFavorite = await isFavoriteByUser(user_id, recipe_id)
    if (!isFavorite)
      await DB_utils.execQuery(`insert into user_favorited_recipes values ('${recipe_id}',${user_id})`);
}
async function getFavoriteRecipes(user_id){
  // can be a spoonculaer recipeID or in a format as U_ID for private recipes
    const recipes_id = await DB_utils.execQuery(`select recipeID from user_favorited_recipes where userID=${user_id}`);
    return recipes_id;
}
async function isFavoriteByUser(user_id, recipe_id){
    const result = await DB_utils.execQuery(
      // recipeID === recipe_id is a string compare test!!!
      `SELECT * FROM user_favorited_recipes WHERE userID = ${user_id} AND recipeID = '${recipe_id}'`
    );
    return result.length > 0;
}
async function removeFavoriteRecipe(user_id, recipe_id) {
  await DB_utils.execQuery(
    `DELETE FROM user_favorited_recipes WHERE userID = ${user_id} AND recipeID = '${recipe_id}'`
  );
}


// // Watched:
// async function markAsWatched(user_id, recipe_id){
//   // recipe_id can be U_ID or just ID from spooncular

//   // delete old record if ID already exist
//   const isWatched = await isWatchedByUser(user_id, recipe_id);
//   if (isWatched)
//     await DB_utils.execQuery(`DELETE FROM user_recipe_views WHERE userID = ${user_id} AND recipeID = '${recipe_id}'`);

//   // insert new watched recipe
//   await DB_utils.execQuery(`
//     INSERT INTO user_recipe_views (recipeID, userID)
//     VALUES ('${recipe_id}', ${user_id});
//   `);

//   // delete older than 3 recent views
//   await DB_utils.execQuery(`
//     DELETE FROM user_recipe_views
//     WHERE userID = ${user_id}
//       AND recipeID NOT IN (
//         SELECT recipeID
//         FROM (
//           SELECT recipeID
//           FROM user_recipe_views
//           WHERE userID = ${user_id}
//           ORDER BY viewed_at DESC
//           LIMIT 3
//         ) AS recent
//       );
//   `);
// }
// async function getWatchedRecipes(user_id){
//   // can be a spoonculaer recipeID or in a format as U_ID for private recipes
//     const recipes_id = await DB_utils.execQuery(`select recipeID from user_recipe_views where userID=${user_id}`);
//     return recipes_id;
// }
// async function isWatchedByUser(user_id, recipe_id){
//     const result = await DB_utils.execQuery(
//       // recipeID === recipe_id is a string compare test!!!
//       `SELECT * FROM user_recipe_views WHERE userID = ${user_id} AND recipeID = '${recipe_id}'`
//     );
//     return result.length > 0;
// }


function sqlEscape(str) {
  return str.replace(/'/g, "''");
}

// User's Recipes - All recipes are a DB recipe with ID formatted as U_ID
async function createNewRecipe(user_id, recipe_details) {
  const {
    title,
    readyInMinutes,
    image,
    vegan,
    vegetarian,
    glutenFree,
    extendedIngredients,
    instructions,
    servings,
  } = recipe_details;

  const result = await DB_utils.execQuery(`
    SELECT MAX(CAST(SUBSTRING(recipeID, 3) AS UNSIGNED)) AS maxID
    FROM recipes
    WHERE recipeID LIKE 'U_%'
  `);
  const maxID = result[0].maxID || 0;
  const newID = `U_${maxID + 1}`;

     await DB_utils.execQuery(
      `
    INSERT INTO recipes (
    recipeID, title, readyInMinutes, image,
    vegan, vegetarian, glutenFree, extendedIngredients,
    instructions, servings, userID)
    VALUES (
      '${newID}',
      '${sqlEscape(title)}',
      ${readyInMinutes},
      '${sqlEscape(image)}',
      ${vegan ? 1 : 0},
      ${vegetarian ? 1 : 0},
      ${glutenFree ? 1 : 0},
      '${sqlEscape(JSON.stringify(extendedIngredients))}',
      '${sqlEscape(instructions)}',
      ${servings},
      ${user_id})`
    );

  return { success: true, recipeID: newID };
}

async function getUserRecipes(user_id) {
  const recipes_id = await DB_utils.execQuery(`
    SELECT recipeID
    FROM recipes
    WHERE userID = ${user_id}
    ORDER BY CAST(SUBSTRING(recipeID, 3) AS UNSIGNED) 
  `);
  return recipes_id;
}

// async function removeUserRecipe(recipeID) {
//   await DB_utils.execQuery(`DELETE FROM recipes WHERE recipeID = '${recipeID}';`);
// }

async function removeUserRecipe(user_id, recipeID) {
  const result = await DB_utils.execQuery(
    `DELETE FROM recipes WHERE recipeID = '${recipeID}' AND userID = ${Number(user_id)};`
  );
  // execQuery שלך מחזיר את אובייקט התוצאה; ודא שהוא כולל affectedRows (mysql2 מחזיר)
  return result && (result.affectedRows > 0);
}

// Add user-specific info if logged in
// given an *array* of preview recipe details - specify isFavoriteByUser and isWatched flags for logged-in user
async function completeUserSpecificPreview(session, recipes_preview_info) {
  const current_user = session.user_id;
  if (session && session.user_id){
    for (const recipe of recipes_preview_info){
      let recipeID = recipe.id ? recipe.id : recipe.recipeID;
      recipe.isFavoriteByUser = await isFavoriteByUser(current_user, recipeID);
      recipe.isWatched = await isWatchedByUser(current_user, recipeID);
    }
  }
  return recipes_preview_info;
}

async function getFamilyRecipes(user_id) {
  const family_recipes = await DB_utils.execQuery(
    `SELECT * FROM family_recipes WHERE userID=${user_id}`
  );
  const parsed = family_recipes.map(recipe => ({
    ...recipe,
    image: parseImageField(recipe.image),
  }));
  console.log("🔍 Parsed family recipes:", parsed);
  return parsed;
}

function parseImageField(imageField) {
  try {
    const parsed = JSON.parse(imageField);
    return (Array.isArray(parsed) ? parsed : [parsed]).map(p =>
      String(p).replace(/^public[\\/]+/, '').replace(/\\/g, '/')
    );
  } catch {
    return [String(imageField).replace(/^public[\\/]+/, '').replace(/\\/g, '/')];
  }
}

exports.markAsFavorite = markAsFavorite;
exports.getFavoriteRecipes = getFavoriteRecipes;
exports.isFavoriteByUser = isFavoriteByUser;
exports.completeUserSpecificPreview = completeUserSpecificPreview;
exports.removeFavoriteRecipe = removeFavoriteRecipe;
exports.createNewRecipe = createNewRecipe;
exports.getUserRecipes = getUserRecipes;
exports.removeUserRecipe = removeUserRecipe;
// exports.markAsWatched = markAsWatched;
// exports.getWatchedRecipes = getWatchedRecipes;
// exports.isWatchedByUser = isWatchedByUser;
exports.getFamilyRecipes = getFamilyRecipes;