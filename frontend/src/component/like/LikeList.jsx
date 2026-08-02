import { useEffect, useState } from "react";

import likeService from "../../services/likesServices";
import LikeItem from "./LikeItem";

import "./LikeList.css";


const LikeList = ({
    contentType,
    objectId,
}) => {


    const [likes, setLikes] = useState([]);

    const [loading, setLoading] = useState(true);

    const [loadingMore, setLoadingMore] = useState(false);

    const [error, setError] = useState("");

    const [nextPage, setNextPage] = useState(null);





    useEffect(() => {

        if (!contentType || !objectId) {

            setLoading(false);

            return;

        }


        fetchLikes();


    }, [
        contentType,
        objectId,
    ]);







    const extractLikes = (data) => {

        if (Array.isArray(data)) {

            return data;

        }


        return (
            data?.results ||
            data?.result ||
            []
        );

    };







    const removeDuplicateUsers = (items) => {


        const users = new Set();


        return items.filter((like) => {


            const user =
                like.user;


            const userKey =
                typeof user === "object" &&
                user !== null

                    ? (
                        user.id ||
                        user.username
                    )

                    : user;



            if (!userKey) {

                return true;

            }



            if (users.has(userKey)) {

                return false;

            }



            users.add(userKey);


            return true;


        });


    };








    const fetchLikes = async () => {


        try {


            setLoading(true);

            setError("");



            const response =
                await likeService.getLikes({

                    content_type: contentType,

                    object_id: objectId,

                });




            const data =
                extractLikes(
                    response.data
                );

            console.log("LIKE API RESPONSE:", data);



            setLikes(
                removeDuplicateUsers(data)
            );



            setNextPage(
                response.data?.next || null
            );


        }


        catch (err) {


            console.error(
                "Like fetch error:",
                err
            );


            setError(
                "Unable to load likes"
            );


        }


        finally {


            setLoading(false);


        }


    };









    const loadMore = async () => {


        if (!nextPage) {

            return;

        }



        try {


            setLoadingMore(true);



            const page =
                new URL(nextPage)
                    .searchParams
                    .get("page");




            const response =
                await likeService.getLikes({

                    content_type: contentType,

                    object_id: objectId,

                    page,

                });




            const data =
                extractLikes(
                    response.data
                );



            setLikes((prev) =>

                removeDuplicateUsers([
                    ...prev,
                    ...data,
                ])

            );



            setNextPage(
                response.data?.next || null
            );


        }


        catch (err) {


            console.error(
                "Load more likes error:",
                err
            );


        }


        finally {


            setLoadingMore(false);


        }


    };









    if (loading) {

        return (

            <div className="like-list-state">

                Loading likes...

            </div>

        );

    }







    if (error) {

        return (

            <div className="like-list-state error">

                {error}

            </div>

        );

    }







    if (!likes.length) {

        return (

            <div className="like-list-state">

                No likes yet.

            </div>

        );

    }








    return (

        <div className="like-list">


            {
                likes.map((like) => (

                    <LikeItem

                        key={
                            like.user?.id ||
                            like.user?.username ||
                            like.user ||
                            like.id
                        }

                        like={like}

                    />

                ))
            }






            {
                nextPage && (

                    <button

                        type="button"

                        className="like-list-load-more"

                        onClick={loadMore}

                        disabled={loadingMore}

                    >

                        {
                            loadingMore
                                ? "Loading..."
                                : "Load More"
                        }


                    </button>

                )
            }



        </div>

    );


};


export default LikeList;