var express = require("express");
var router = express.Router();

const DB_utils = require("./utils/DButils");
const user_utils = require("./utils/user_utils");
const recipe_utils = require("./utils/recipes_utils");


// middleware to verify that the user is logged in
router.use(async function (request, response, next) {
  console.log("Session data:", request.session);
  if (request.session && request.session.user_id) {
    try {
      const users = await DB_utils.execQuery("SELECT userID FROM users");
      const userExists = users.find((x) => x.userID === request.session.user_id);
      if (userExists) {
        request.user_id = request.session.user_id;
        next();
      } else {
        response.status(401).send("Unauthorized: user not found");
      }
    } catch (err) {
      next(err);
    }
  } else {
    response.sendStatus(401);
  }
});

// personal recipes:

// Add a new recipe to the logged-in user's personal recipes
router.post('/recipes', async (request, response, next) => {
  try{
    console.log("Adding new recipe:", request.body);
    const user_id = request.session.user_id;
    const recipe_details = request.body;
    const status = await user_utils.createNewRecipe(user_id, recipe_details);

    if (!status.success)
      return response.status(500).send("Server failed to add new recipe");
    response.status(200).send(`Recipe added to list ${status.recipe_id}`);
    } catch(error){
    next(error);
  }
});

// Get the logged-in user's personal recipes
router.get("/recipes", async (request, response, next) => {
  try{
    const user_id = request.session.user_id;
    const recipes_id = await user_utils.getUserRecipes(user_id);
    let recipes_id_array = [];
    recipes_id.map((element) => recipes_id_array.push(element.recipeID)); //extracting the recipe ids into array
    // console.log(`User recipes by id: ${recipes_id_array}`);
    // const results = await user_utils.completeUserSpecificPreview(request.session, await recipe_utils.getRecipesPreview(recipes_id_array));
    response.status(200).send(recipes_id_array);
  } catch(error){
    next(error); 
  }
});

// Delete a personal recipe by ID
router.delete("/recipes/:recipeID", async (request, response, next) => {
  try {
    const user_id = request.session.user_id;
    let { recipeID: recipes_id } = request.params;

    console.log(`Deleting recipe with ID: ${recipes_id} for user: ${user_id}`);
    
    if (!recipes_id.startsWith('U_')) {
      recipes_id = `U_${recipes_id}`;
    }
    const deleted = await user_utils.removeUserRecipe(user_id, recipes_id);
    if (!deleted) {
      return response.status(404).send({ message: "Recipe not found" });
    }
    response.status(200).send({ message: "Recipe successfully removed from your recipes list"});
  } catch (error) {
    next(error);
  }
});

// family recipes:

// Get family recipes for the logged-in user
router.get('/recipes/family', async (request, response) => {
  try {
    const user_id = request.session.user_id;
    const family_recipes = await user_utils.getFamilyRecipes(user_id);
    if (family_recipes.length === 0) {
       return response.status(404).send("No family recipes found for this user");
    }
    response.status(200).send(family_recipes);
  } catch (error) {
    console.error("Error fetching family recipes:", error);
    response.status(500).send({ message: "Internal Server Error" });
  }
});


// favorites recipes: 
// Mark recipeID as favorite for current user session
router.post('/favorites', async (request, response, next) => {
  try{
    const user_id = request.session.user_id;
    const recipe_id = request.body.recipe_id;
    
    await user_utils.markAsFavorite(user_id, recipe_id);
    response.status(200).send("The Recipe successfully saved as favorite");
    } catch(error){
    next(error);
  }
})

// Get favorite recipes for current user session
router.get('/favorites', async (request, response, next) => {
  try {
    const user_id = request.session.user_id;
    const recipes_id = await user_utils.getFavoriteRecipes(user_id);
    const recipes_id_array = recipes_id.map(e => e.recipeID);

    if (recipes_id_array.length === 0) {
      return response.status(200).send([]); 
    }

    const previews = await recipe_utils.getRecipesPreview(recipes_id_array);
    const results = await user_utils.completeUserSpecificPreview(request.session, previews);

    response.status(200).send(results);
  } catch (error) {
    next(error);
  }
});


// Remove recipeID from favorites for current user session
router.delete('/favorites/:recipeID', async (request, response, next) => {
  try {
    const user_id = request.session.user_id;
    const recipe_id = request.params.recipeID;

    const isFavorite = await user_utils.isFavoriteByUser(user_id, recipe_id);
    if (!isFavorite) {
      response.status(404).send({ message: "Recipe not found in favorites" });
      return;
    }
    await user_utils.removeFavoriteRecipe(user_id, recipe_id);
    response.status(200).send({ message: "Recipe successfully removed from favorites" });
  } catch (error) {
    next(error);
  }
});

// Check if a username exists
router.get("/check-username", async (request, response, next) => {
  try {
    const { username } = request.query;
    if (!username) {
      return response.status(400).send({ message: "Username is required", success: false });
    }
    const users = await DB_utils.execQuery(
      `SELECT username FROM users WHERE username = '${username}'`
);
    const exists = users.length > 0;
    response.status(200).send({ exists, success: true });
  } catch (err) {
    next(err); 
  }
});

module.exports = router;