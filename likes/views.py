from django.contrib.contenttypes.models import ContentType

from rest_framework import generics
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAuthenticated

from .models import Like
from .serializers import (
    LikeCreateSerializer,
    LikeSerializer,
)



class LikeListCreateView(
    generics.ListCreateAPIView
):


    permission_classes = [
        IsAuthenticated,
    ]



    def get_queryset(self):


        queryset = (
            Like.objects
            .select_related(
                "user",
                "content_type",
            )
            .all()
            .order_by(
                "-created_at",
            )
        )



        content_type = (
            self.request
            .query_params
            .get("content_type")
        )


        object_id = (
            self.request
            .query_params
            .get("object_id")
        )



        if content_type and object_id:


            queryset = queryset.filter(

                content_type__model=content_type,

                object_id=object_id,

            )



        return queryset




    def get_serializer_class(self):


        if self.request.method == "POST":

            return LikeCreateSerializer


        return LikeSerializer







class LikeDeleteView(
    generics.DestroyAPIView
):


    queryset = Like.objects.all()

    serializer_class = LikeSerializer


    permission_classes = [
        IsAuthenticated,
    ]



    ALLOWED_MODELS = (
        "post",
        "comment",
    )



    def get_object(self):


        content_type_name = self.kwargs["content_type"]

        object_id = self.kwargs["object_id"]



        if content_type_name not in self.ALLOWED_MODELS:

            raise NotFound(
                detail="Invalid content type."
            )



        content_type = ContentType.objects.filter(
            model=content_type_name,
        ).first()



        if content_type is None:

            raise NotFound(
                detail="Invalid content type."
            )



        try:

            return (
                Like.objects
                .select_related(
                    "user",
                    "content_type",
                )
                .get(

                    user=self.request.user,

                    content_type=content_type,

                    object_id=object_id,

                )
            )


        except Like.DoesNotExist:

            raise NotFound(
                detail="Like does not exist."
            )