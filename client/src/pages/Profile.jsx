import React, { useEffect, useState } from "react";
import Container from "react-bootstrap/Container";
import Image from "react-bootstrap/Image";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
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

  const [isEditing, setIsEditing] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [updateError, setUpdateError] = useState(null);

  useEffect(() => {
    const isOwner = loggedInUser && loggedInUser.id === parseInt(profileId);
    setOwner(isOwner);

    const fetchProfileData = async () => {
      setError(null);
      setUpdateError(null);
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
          setNewUsername(json.user.username);
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

  const handleUsernameCancel = () => {
    setIsEditing(false);
    setNewUsername(profileData.username);
    setUpdateError(null);
  };

  const handleUsernameSave = async () => {
    if (newUsername === profileData.username) {
      setIsEditing(false);
      setUpdateError(null);
      return;
    }

    setUpdateError(null);

    try {
      const response = await fetch(`${API_URL}/users/username`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ username: newUsername }),
      });

      if (!response.ok) {
        let errorMsg = `Failed to update username. Status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.message || errorData.error || errorMsg;
        } catch (jsonError) {}
        throw new Error(errorMsg);
      }

      setProfileData({ ...profileData, username: newUsername });
      setIsEditing(false);
    } catch (err) {
      console.error("Error updating username:", err);
      setUpdateError(err.message);
    }
  };

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
          src={profileData.avatarurl}
          alt={`${profileData.username}'s Profile`}
          roundedCircle
          className="profile-avatar"
        />

        <div className="w-100 text-center">
          {!isEditing ? (
            <h5>
              {profileData.username}
              {owner && (
                <FaPencilAlt
                  onClick={() => setIsEditing(true)}
                  style={{
                    cursor: "pointer",
                    marginLeft: "10px",
                    fontSize: "0.8em",
                  }}
                />
              )}
            </h5>
          ) : (
            <div
              className="d-flex align-items-center"
              style={{ gap: "10px", maxWidth: "400px", margin: "0 auto" }}
            >
              <Form.Control
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
              />
              <Button variant="success" size="sm" onClick={handleUsernameSave}>
                Save
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleUsernameCancel}
              >
                Cancel
              </Button>
            </div>
          )}

          {updateError && (
            <div className="text-danger mt-2" role="alert">
              {updateError}
            </div>
          )}
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
