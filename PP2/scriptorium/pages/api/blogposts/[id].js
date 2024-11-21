// pages/api/blogposts/[id].js
import { verifyAuthorizationHeader } from '@/utils/auth';
import prisma from '@/lib/prisma'

export default async function handler(req, res) {
    const { id } = req.query;
    // PUT API route for updating blog post with [id]
    if (req.method === "PUT") {
        // User authentication
        try{
            var authUser = verifyAuthorizationHeader(req.headers.authorization);
        }
        catch (err) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const { title, description, tag, content, templateIds, isHidden } = req.body;
        if (isHidden !== undefined && authUser.role !== "ADMIN") {
            return res.status(401).json({ error: "Unauthorized" });
        }
        try {
            const blogPostExists = await prisma.blogPost.findUnique({
                where: { id: parseInt(id) },
            });
            if (!blogPostExists || (blogPostExists.isHidden && authUser.role !== "ADMIN")) {
                return res.status(404).json({ error: "Blog post not found" });
            }
            if (authUser.userId !== blogPostExists.userId && authUser.role !== "ADMIN") {
                return res.status(401).json({ error: "Unauthorized" });
            }
            const blogPostData = {
                title,
                description,
                tag, 
                content,
                isHidden
            };

            // Only update templates if templateIds is provided and not empty
            if (templateIds) {
                blogPostData.templates = {
                    set: templateIds.map(templateId => ({ id: templateId }))
                };
            }

            const updatedBlogPost = await prisma.blogPost.update({
                where: { id: parseInt(id) },
                data: blogPostData
            });
    
            return res.status(200).json({ 
                message: "Blog post updated successfully",
                updatedBlogPost        
            });
        }
        catch (err) {
            res.status(500).json({ error: "Internal Server Error" });
        }
    } 
    // DELETE API route for deleting blog post with [id]
    else if (req.method === "DELETE") {
        // User authentication
        try{
            var authUser = verifyAuthorizationHeader(req.headers.authorization);
        }
        catch (err) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        try {
            const blogPostExists = await prisma.blogPost.findUnique({
                where: { id: parseInt(id) },
            });
            if (!blogPostExists || (blogPostExists.isHidden && authUser.role !== "ADMIN")) {
                return res.status(404).json({ error: "Blog post not found" });
            }
            if (authUser.userId !== blogPostExists.userId && authUser.role !== "ADMIN") {
                return res.status(401).json({ error: "Unauthorized" });
            }
            await prisma.blogPost.delete({
                where: { id: parseInt(id) }
            });
            return res.status(200).json({ message: "Blog post deleted successfully" });
        }
        catch (err) {
            res.status(500).json({ error: err });
        }
    } 
    else if (req.method === "GET") {
        try {
            var authUser = req.headers.authorization ? verifyAuthorizationHeader(req.headers.authorization) : null;
        } 
        catch (err) {
            return res.status(401).json({ error: err });
        }
        try {
            const foundPost = await prisma.blogPost.findUnique({
                where: { id: parseInt(id) },
                include: {
                    comments: {
                        select: {
                            id: true,
                            content: true,
                            upvotes: true,
                            downvotes: true,
                            user: {
                                select: {
                                    firstName: true,
                                    lastName: true
                                }
                            },
                            children: true,
                            parentId: true
                        }
                    },
                    ...(authUser?.role === 'ADMIN' && {
                        reports: {
                            select: {
                                id: true
                            }
                        } 
                    }),
                    user: {
                        select: {
                            firstName: true,
                            lastName: true,
                            avatar: true
                        }
                    },
                    templates: {
                        select: {
                            id: true,
                            title: true
                        }
                    }
                }
                
            });

            if (!foundPost) {
                return res.status(404).json({ message: "Blog post not found" });
            }
         
            if (foundPost.isHidden === true && (authUser?.role !== "ADMIN" || authUser?.userId !== foundPost.userId)) {
                return res.status(401).json({ message: "Unauthorized" });
            }

            res.status(200).json({ message: "Blog post retrieved successfully", blogPost: foundPost });
        }
        catch {
            res.status(500).json({ error: "Internal Server Error" });
        }
    }
    else {
        res.status(405).json({ message: "Method not allowed" });
    }
}