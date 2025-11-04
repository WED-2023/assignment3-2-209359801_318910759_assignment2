CREATE TABLE `users` (
  `userID` int NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL,
  `password` varchar(100) NOT NULL,
  `firstname` varchar(100) NOT NULL,
  `lastname` varchar(100) NOT NULL,
  `email` varchar(320) NOT NULL,
  `country` varchar(100) NOT NULL,
  PRIMARY KEY (`userID`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `recipes` (
  `recipeID` varchar(255) NOT NULL,
  `title` varchar(255) NOT NULL,
  `readyInMinutes` int NOT NULL,
  `image` varchar(500) NOT NULL,
  `vegan` tinyint(1) NOT NULL,
  `vegetarian` tinyint(1) NOT NULL,
  `glutenFree` tinyint(1) NOT NULL,
  `extendedIngredients` text NOT NULL,
  `instructions` text NOT NULL,
  `servings` int NOT NULL,
  `userID` int DEFAULT NULL,
  PRIMARY KEY (`recipeID`),
  KEY `userID` (`userID`),
  CONSTRAINT `recipes_ibfk_1` FOREIGN KEY (`userID`) REFERENCES `users` (`userID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `family_recipes` (
  `recipeID` varchar(255) NOT NULL,
  `userID` int DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `readyInMinutes` int NOT NULL,
  `image` varchar(500) NOT NULL,
  `extendedIngredients` text NOT NULL,
  `instructions` text NOT NULL,
  `timeInYear` varchar(255) DEFAULT NULL,
  `recipeMaster` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`recipeID`),
  KEY `userID` (`userID`),
  CONSTRAINT `family_recipes_ibfk_1` FOREIGN KEY (`userID`) REFERENCES `users` (`userID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `recipes_local_likes` (
  `recipeID` int DEFAULT NULL,
  `likes` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `user_favorited_recipes` (
  `recipeID` varchar(255) NOT NULL,
  `userID` int NOT NULL,
  PRIMARY KEY (`recipeID`,`userID`),
  KEY `userID` (`userID`),
  CONSTRAINT `user_favorited_recipes_ibfk_1` FOREIGN KEY (`userID`) REFERENCES `users` (`userID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `user_recipe_views` (
  `userID` int DEFAULT NULL,
  `recipeID` text,
  `viewed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
