import {
    FaCheckCircle,
} from "react-icons/fa";

import "./LikeItem.css";


const LikeItem = ({ like }) => {

    // Support both:
    // user: {username, profile_picture...}
    // user: "ravi"
    const user =
        typeof like.user === "object" && like.user !== null
            ? like.user
            : {
                username: like.user,
            };


    const avatar =
        user.profile_picture ||
        user.avatar ||
        "/default-avatar.png";


    const username =
        user.username ||
        user.email ||
        "Unknown User";


    const fullname =
        user.full_name ||
        user.first_name ||
        username;


    return (

        <div className="like-item">


            {/* Avatar */}

            <div className="like-item-avatar-wrapper">


                <img
                    className="like-item-avatar"
                    src={avatar}
                    alt={username}
                    loading="lazy"
                />


                {
                    user.is_online && (
                        <span
                            className="like-item-online"
                        />
                    )
                }


            </div>



            {/* User Info */}

            <div className="like-item-content">


                <div className="like-item-name">


                    <span
                        className="like-item-username"
                    >
                        {username}
                    </span>



                    {
                        user.is_verified && (

                            <FaCheckCircle
                                className="like-item-verified"
                            />

                        )
                    }


                </div>



                <div
                    className="like-item-fullname"
                >

                    {fullname}

                </div>


            </div>


        </div>

    );

};


export default LikeItem;