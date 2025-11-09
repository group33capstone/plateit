const API_BASE_URL = import.meta.env.VITE_API_URL;

const RecipesAPI = {
  getAllRecipes: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/recipes`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching recipes:", error);
      throw error;
    }
  },

  getRecipeById: async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/recipes/${id}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching recipe:", error);
      throw error;
    }
  },
};

export default RecipesAPI;
