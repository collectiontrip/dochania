import {
    useEffect,
    useState,
} from "react";

import {
    useParams,
} from "react-router-dom";

import postService from "../../../../services/postService";

import PostCard from "../../PostCard/PostCard";

import "../../SelfPostList/SelfPostList.css"

const UserPostList = () => {

    const { id } = useParams();

    const [posts, setPosts] = useState([]);

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState("");

    const fetchPosts = async () => {

        try {

            setLoading(true);

            setError("");

            const response =
                await postService.getUserPosts(
                    id
                );

            setPosts(
                response.data.results ??
                response.data
            );

        } catch (error) {

            console.error(error);

            setError(
                "Failed to load posts."
            );

        } finally {

            setLoading(false);

        }

    };

    useEffect(() => {

        fetchPosts();

    }, [id]);

    if (loading) {

        return (
            <div className="self-post-list-loading">
                Loading...
            </div>
        );

    }

    if (error) {

        return (
            <div className="self-post-list-error">
                {error}
            </div>
        );

    }

    if (posts.length === 0) {

        return (
            <div className="self-post-list-empty">
                No posts available.
            </div>
        );

    }

    return (

        <div className="self-post-list">

            {posts.map((post) => (

                <PostCard
                    key={post.id}
                    post={post}
                />

            ))}

        </div>

    );

};

export default UserPostList;