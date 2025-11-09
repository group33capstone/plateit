import React, { useEffect, useState } from "react";
import Container from "react-bootstrap/Container";
import Image from "react-bootstrap/Image";
import Button from "react-bootstrap/Button";
import { FaPencilAlt } from "react-icons/fa";
import "../styles/profile.css";
import { Link, useParams } from "react-router-dom";
import { useUser } from "../hooks/useUser";

function Profile() {
  const API_URL = import.meta.env.VITE_API_URL;

  const { id: profileId } = useParams();
  const loggedInUser = useUser();
  const FETCH_URL = `${API_URL}/users/${profileId}`;

  const [owner, setOwner] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const isOwner = loggedInUser && loggedInUser.id === parseInt(profileId);
    setOwner(isOwner);

    const fetchProfileData = async () => {
      setError(null);
      try {
        const response = await fetch(FETCH_URL, {
          credentials: "include",
        });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("User not found.");
          }
          throw new Error(
            `Failed to fetch profile. Status: ${response.status}`
          );
        }

        const json = await response.json();

        if (json.user) {
          setProfileData(json.user);
        } else {
          throw new Error("Profile data not found in response.");
        }
      } catch (err) {
        console.error("Error loading profile:", err);
        setError(err.message);
        setProfileData(null);
      }
    };

    if (loggedInUser !== undefined) {
      fetchProfileData();
    }
  }, [profileId, loggedInUser, FETCH_URL]);

  if (loggedInUser === undefined || profileData === null) {
    return (
      <Container fluid="md" className="text-center my-5">
        Loading profile...
      </Container>
    );
  }

  if (error) {
    return (
      <Container fluid="md" className="text-center my-5 text-danger">
        Error: {error}. Could not load profile.
      </Container>
    );
  }

  return (
    <Container
      fluid="md"
      className="bg-white p-4 p-md-5 my-5 rounded shadow-sm"
    >
      <div
        className="d-flex flex-column align-items-center"
        style={{ gap: "1.5rem" }}
      >
        <Image
          src={profileData.avatarurl || "DEFAULT_AVATAR_URL"}
          alt={`${profileData.username}'s Profile`}
          roundedCircle
          className="profile-avatar"
        />
        <div>
          <h5>
            {profileData.username}
            {owner && <FaPencilAlt />}
          </h5>
        </div>

        <div className="d-grid gap-2 w-100">
          <Button
            variant="outline-secondary"
            size="lg"
            as={Link}
            to={`/user/recipes/${profileId}`}
          >
            {owner ? "View My Recipes" : `${profileData.username}'s Recipes`}
          </Button>

          {owner && (
            <>
              <Button
                variant="outline-secondary"
                size="lg"
                as={Link}
                to={`/users/${profileId}/savedrecipes`}
              >
                View Saved Recipes
              </Button>
              <Button
                variant="outline-secondary"
                size="lg"
                as={Link}
                to={`/users/${profileId}/mycomments`}
              >
                View Comments
              </Button>
              <Button variant="danger" size="lg">
                Delete My Account
              </Button>
            </>
          )}
        </div>
      </div>
    </Container>
  );
}

export default Profile;
