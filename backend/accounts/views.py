from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .serializers import RegisterSerializer,LoginSerializer,OrganizationMappingSerializer,UserSerializer
from .models import User
from organizations.models import Organization

class RegisterView(APIView):
    def post(self,request):
        serializer=RegisterSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"message":"Registration successful"},status=status.HTTP_201_CREATED)
        return Response(serializer.errors,status=status.HTTP_400_BAD_REQUEST)

class LoginView(APIView):
    def post(self,request):
        serializer=LoginSerializer(data=request.data)
        if serializer.is_valid():
            return Response(serializer.validated_data,status=status.HTTP_200_OK)
        return Response(serializer.errors,status=status.HTTP_400_BAD_REQUEST)

class MapOrganizationView(APIView):
    permission_classes=[IsAuthenticated]
    def post(self,request):
        serializer=OrganizationMappingSerializer(data=request.data)
        if serializer.is_valid():
            org_code=serializer.validated_data['organization_code']
            org=Organization.objects.get(organization_code=org_code)
            try:
                profile=request.user.learner_profile
                profile.organization=org
                profile.save()
                return Response({"message":"Organization mapped successfully"},status=status.HTTP_200_OK)
            except AttributeError:
                return Response({"message":"User is not a learner"},status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors,status=status.HTTP_400_BAD_REQUEST)

class AdminBaseView(APIView):
    permission_classes=[IsAuthenticated]
    def initial(self,request,*args,**kwargs):
        super().initial(request,*args,**kwargs)
        if not request.user.is_staff and not request.user.is_superuser:
            self.permission_denied(request,message="Only admin staff can perform this action.")

class AdminUsersListView(AdminBaseView):
    def get(self,request):
        role=request.query_params.get('role')
        is_approved=request.query_params.get('is_approved')
        users=User.objects.all().order_by('-created_at')
        if role:
            users=users.filter(role=role)
        if is_approved is not None:
            approved_bool=is_approved.lower()=='true'
            users=users.filter(is_approved=approved_bool)
        serializer=UserSerializer(users,many=True)
        return Response(serializer.data,status=status.HTTP_200_OK)

class AdminUserApproveView(AdminBaseView):
    def post(self,request,pk):
        try:
            user=User.objects.get(pk=pk)
            user.is_approved=True
            user.save()
            if user.role=='organization_admin':
                for org in user.created_organizations.all():
                    org.is_approved=True
                    org.save()
            return Response({"message":"User approved successfully"},status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({"error":"User not found"},status=status.HTTP_404_NOT_FOUND)

class AdminUserDeleteView(AdminBaseView):
    def delete(self,request,pk):
        try:
            user=User.objects.get(pk=pk)
            user.delete()
            return Response({"message":"User deleted successfully"},status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({"error":"User not found"},status=status.HTTP_404_NOT_FOUND)

class AdminOrganizationsListView(AdminBaseView):
    def get(self,request):
        orgs=Organization.objects.all().order_by('-created_at')
        data=[]
        for org in orgs:
            data.append({
                'id':org.id,
                'name':org.name,
                'organization_type':org.organization_type,
                'organization_code':org.organization_code,
                'location':org.location,
                'website':org.website,
                'created_by':org.created_by.email if org.created_by else None,
                'is_approved':org.is_approved,
                'created_at':org.created_at
            })
        return Response(data,status=status.HTTP_200_OK)

    def post(self,request):
        name=request.data.get('name')
        org_type=request.data.get('organization_type')
        org_code=request.data.get('organization_code')
        location=request.data.get('location')
        website=request.data.get('website','')
        if not name or not org_type or not org_code or not location:
            return Response({"error":"Missing required fields"},status=status.HTTP_400_BAD_REQUEST)
        if Organization.objects.filter(organization_code=org_code).exists():
            return Response({"error":"Organization code already exists"},status=status.HTTP_400_BAD_REQUEST)
        org=Organization.objects.create(
            name=name,
            organization_type=org_type,
            organization_code=org_code,
            location=location,
            website=website,
            created_by=request.user,
            is_approved=True
        )
        return Response({"message":"Organization created successfully"},status=status.HTTP_201_CREATED)

class AdminOrganizationApproveView(AdminBaseView):
    def post(self,request,pk):
        try:
            org=Organization.objects.get(pk=pk)
            org.is_approved=True
            org.save()
            if org.created_by:
                org.created_by.is_approved=True
                org.created_by.save()
            return Response({"message":"Organization approved successfully"},status=status.HTTP_200_OK)
        except Organization.DoesNotExist:
            return Response({"error":"Organization not found"},status=status.HTTP_404_NOT_FOUND)

class AdminOrganizationDeleteView(AdminBaseView):
    def delete(self,request,pk):
        try:
            org=Organization.objects.get(pk=pk)
            org.delete()
            return Response({"message":"Organization deleted successfully"},status=status.HTTP_200_OK)
        except Organization.DoesNotExist:
            return Response({"error":"Organization not found"},status=status.HTTP_404_NOT_FOUND)
