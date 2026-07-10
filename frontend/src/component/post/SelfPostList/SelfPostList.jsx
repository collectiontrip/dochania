import {
    useEffect,
    useState,
} from "react";

import postService from "../../../services/postService";

import PostCard from "../PostCard/PostCard";

import "./SelfPostList.css";

const SelfPostList = () => {

    const [posts, setPosts] = useState([]);

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState("");

    const fetchPosts = async () => {

        try {

            setLoading(true);

            setError("");

            const response =
                await postService.getSelfPosts();

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

    }, []);

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
                You haven't created any posts yet.
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

export default SelfPostList;