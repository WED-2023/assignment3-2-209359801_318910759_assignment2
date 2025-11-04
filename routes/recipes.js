var express = require("express");
var router = express.Router();

const recipes_utils = require("./utils/recipes_utils");
const user_utils = require("./utils/user_utils");

//  This is in the home page 
// returns a 3 random recipes
router.get("/", async (request, response, next) => {
    try {
    const random_recipes = await user_utils.completeUserSpecificPreview(
    request.session, await recipes_utils.get3RandomPreviwe());    
    response.send(random_recipes);
  } 
  catch (error) {next(error);}
});

// Search recipes according to filters and query parameters
router.get("/search", async (request, response, next) => {
  try {
    // extract query params individually
    const queryParam = request.query.query;
    const cuisineType = request.query.cuisine;
    const dietType = request.query.diet;
    const intoleranceRaw = request.query.intolerance;
    const limitParam = request.query.limit ? parseInt(request.query.limit) : 5;
    const sortOption = request.query.sort;

    // handle intolerance list
    const intoleranceList = intoleranceRaw ? intoleranceRaw.split(",") : [];

    // build the search options object
    const searchConfig = {
      cuisine: cuisineType,
      diet: dietType,
      intolerance: intoleranceList,
      limit: limitParam,
      sort: sortOption,
    };

    // fetch data from the Spoonacular API (via utils)
    const apiResults = await recipes_utils.searchRecipes(queryParam, searchConfig);

    // store last search for logged-in users
    const currentSession = request.session;
    if (currentSession && currentSession.user_id) {
      currentSession.last_search = apiResults;
    }

    // get preview-ready results
    const basicPreviews = await recipes_utils.getRecipesPreview(apiResults);
    const userAdjustedResults = await user_utils.completeUserSpecificPreview(
      currentSession,
      basicPreviews
    );

    // return results to client
    response.status(200).json(userAdjustedResults);
  } catch (error) {
    next(error);
  }
});

// // Get recipe details by ID
router.get("/search/:recipeId", async (request, response, next) => {
  try {
    // grab params & session into their own consts
    const recipeId = request.params.recipeId;
    const sessionRef = request.session;

    // get raw recipe details
    const rawRecipe = await recipes_utils.getRecipeDetails(recipeId);

    // enrich with user-specific flags (favorites/watched) if logged in
    const wrapped = [rawRecipe];
    const completed = await user_utils.completeUserSpecificPreview(sessionRef, wrapped);
    const enrichedRecipe = completed[0];

    // send back
    response.status(200).json(enrichedRecipe);
  } catch (err) {
    next(err);
  }
});

// returns the last searched recipes previews
router.get("/LastSearched", async (request, response, next) => {
  try{
    if (!request.session || !request.session.user_id){
      response.status(401).send("Unauthorized: user not found");
    } 
    const recipeIDs = request.session.last_search;
    const last_searched_preview = await user_utils.completeUserSpecificPreview(
             request.session, await recipes_utils.getRecipesPreview(recipeIDs));
    response.status(200).send(last_searched_preview);
  } catch(error){
    next(error); 
  }
});

// increase likes of a recipe by ID
router.post("/like/:recipeID", async (request, response, next) => {
  try {
    if (!request.session || !request.session.user_id) {
      return response.status(401).send("Unauthorized: user not found");
    }
    await recipes_utils.increaseRecipeLikes(request.params.recipeID);
    return response.sendStatus(200);
  } catch (error) {
    next(error);
  }
});


module.exports = router;